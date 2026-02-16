// Core auth orchestration logic.
import * as crypto from 'crypto';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { IOneTimeTokenRepository } from '../../shared/interfaces/IOneTimeTokenRepository.js';
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';
import type { IUserByEmailLookup } from '../../shared/interfaces/IUserByEmailLookup.js';
import type { IGlobalUserRepository } from '../../shared/interfaces/IGlobalUserRepository.js';
import type { PasswordService } from '../password/password.service.js';
import type { TokenService } from '../token/token.service.js';
import type { TotpService } from '../mfa/totp.service.js';
import type {
  RegisterDto,
  LoginCredentials,
  AuthResult,
  CreateUserDto,
} from './auth.types.js';
import { AppError, InvalidCredentialsError, AccountLockedError } from './auth.errors.js';

const PASSWORD_RESET_EXPIRY_HOURS = 1;

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export type GetUserRepository = (tenantId: string) => IUserRepository;

export class AuthService {
  constructor(
    private readonly getUserRepo: GetUserRepository,
    private readonly auditRepo: IAuditRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly totpService: TotpService,
    private readonly oneTimeTokenRepo: IOneTimeTokenRepository,
    private readonly emailSender: IEmailSender,
    private readonly userByEmailLookup: IUserByEmailLookup,
    private readonly globalUserRepo: IGlobalUserRepository,
    private readonly resetPasswordBaseUrl: string
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const policyResult = this.passwordService.validatePolicy(dto.password);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join('; '), 400);
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const createUserDto: CreateUserDto = {
      tenantId: dto.tenantId,
      email: dto.email,
      passwordHash,
    };
    const userRepo = this.getUserRepo(dto.tenantId);
    const user = await userRepo.create(createUserDto);

    const tokens = await this.tokenService.issueTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      deviceInfo: {},
    });

    await this.eventPublisher.publish('auth.user.registered', {
      userId: user.id,
      tenantId: user.tenantId,
    });

    await this.auditRepo.create({
      eventType: 'user.registered',
      userId: user.id,
      tenantId: user.tenantId,
    });

    return { user, tokens };
  }

  async login(dto: LoginCredentials): Promise<AuthResult> {
    const user = await this.userByEmailLookup.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AccountLockedError();
    }

    if (!user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const passwordValid = await this.passwordService.verify(
      dto.password,
      user.passwordHash
    );
    if (!passwordValid) {
      throw new InvalidCredentialsError();
    }

    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        throw new AppError('MFA code required', 400);
      }
      if (!user.mfaSecret) {
        throw new AppError('MFA not configured', 400);
      }
      const mfaValid = this.totpService.verify(dto.mfaCode, user.mfaSecret);
      if (!mfaValid) {
        throw new InvalidCredentialsError('Invalid MFA code');
      }
    }

    const tokens = await this.tokenService.issueTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      deviceInfo: {},
    });

    await this.globalUserRepo.update(user.id, {
      lastLoginAt: new Date(),
      loginCount: user.loginCount + 1,
    });

    await this.eventPublisher.publish('auth.user.logged_in', {
      userId: user.id,
    });

    await this.auditRepo.create({
      eventType: 'user.logged_in',
      userId: user.id,
      tenantId: user.tenantId,
    });

    return { user, tokens };
  }

  async logout(
    userId: string,
    refreshToken: string,
    all = false
  ): Promise<void> {
    if (all) {
      await this.tokenService.revokeAllForUser(userId);
    } else {
      await this.tokenService.revokeToken(refreshToken);
    }

    await this.eventPublisher.publish('auth.user.logged_out', {
      userId,
      all,
    });

    await this.auditRepo.create({
      eventType: 'user.logged_out',
      userId,
      metadata: { all },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userByEmailLookup.findByEmail(email);
    if (!user) {
      return;
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
    await this.oneTimeTokenRepo.create({
      userId: user.id,
      tokenHash,
      type: 'password_reset',
      expiresAt,
    });
    const resetLink = `${this.resetPasswordBaseUrl}?token=${encodeURIComponent(rawToken)}`;
    await this.emailSender.sendResetPasswordEmail(user.email, resetLink);
    await this.auditRepo.create({
      eventType: 'password_reset_requested',
      userId: user.id,
      tenantId: user.tenantId,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = sha256(token);
    const ott = await this.oneTimeTokenRepo.findByTokenHashAndType(
      tokenHash,
      'password_reset'
    );
    if (!ott || ott.usedAt || ott.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    const policyResult = this.passwordService.validatePolicy(newPassword);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join('; '), 400);
    }
    const passwordHash = await this.passwordService.hash(newPassword);
    await this.globalUserRepo.update(ott.userId, { passwordHash });
    await this.tokenService.revokeAllForUser(ott.userId);
    await this.oneTimeTokenRepo.markUsed(ott.id);
    await this.auditRepo.create({
      eventType: 'password_reset_completed',
      userId: ott.userId,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = sha256(token);
    const ott = await this.oneTimeTokenRepo.findByTokenHashAndType(
      tokenHash,
      'email_verify'
    );
    if (!ott || ott.usedAt || ott.expiresAt < new Date()) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    await this.globalUserRepo.update(ott.userId, { emailVerified: true });
    await this.oneTimeTokenRepo.markUsed(ott.id);
    await this.auditRepo.create({
      eventType: 'email_verified',
      userId: ott.userId,
    });
  }
}
