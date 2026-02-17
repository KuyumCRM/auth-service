// Core auth orchestration logic.
import * as crypto from 'crypto';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IInvitationRepository } from '../../shared/interfaces/IInvitationRepository.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { IOneTimeTokenRepository } from '../../shared/interfaces/IOneTimeTokenRepository.js';
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';
import type { IOnboardingSessionStore } from '../../shared/interfaces/IOnboardingSessionStore.js';
import type { IInstagramTokenRepository } from '../../shared/interfaces/IInstagramTokenRepository.js';
import type { CreateIgConnectionDto } from '../instagram/instagram.types.js';
import type { PasswordService } from '../password/password.service.js';
import type { TokenService } from '../token/token.service.js';
import type { TotpService } from '../mfa/totp.service.js';
import type {
  SignupWithOnboardingDto,
  SignupResult,
  LoginCredentials,
  LoginResult,
  AcceptInviteDto,
  AcceptInviteResult,
  MembershipInfo,
  TokenPair,
  CreateMembershipDto,
  CreateUserDto,
  CreateTenantDto,
  MeResult,
  TenantStatus,
} from './auth.types.js';
import { PASSWORD_RESET_EXPIRY_HOURS } from '../../config/constants.js';
import {
  AppError,
  InvalidCredentialsError,
  AccountLockedError,
  InvalidOnboardingTokenError,
  UserNotFoundError,
} from './auth.errors.js';
import { IssueTokenOpts } from '../token/token.types.js';

export interface AuthServiceDeps {
  userRepo: IUserRepository;
  tenantRepo: ITenantRepository;
  membershipRepo: IMembershipRepository;
  invitationRepo: IInvitationRepository;
  auditRepo: IAuditRepository;
  eventPublisher: IEventPublisher;
  passwordService: PasswordService;
  tokenService: TokenService;
  totpService: TotpService;
  oneTimeTokenRepo: IOneTimeTokenRepository;
  emailSender: IEmailSender;
  resetPasswordBaseUrl: string;
  onboardingSessionStore: IOnboardingSessionStore;
  instagramRepo: IInstagramTokenRepository;
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  /**
   * Owner signup gated by Instagram onboarding: consume one-time session, create tenant + user + owner membership + IG connection.
   */
  async signupWithOnboarding(dto: SignupWithOnboardingDto): Promise<SignupResult> {
    const payload = await this.deps.onboardingSessionStore.consume(dto.onboardingToken);
    if (!payload) {
      throw new InvalidOnboardingTokenError();
    }

    const policyResult = this.deps.passwordService.validatePolicy(dto.password);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join('; '), 400);
    }

    const existingUser = await this.deps.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const workspaceName = (dto.workspaceName ?? payload.igUsername).trim() || payload.igUsername;
    let slug = slugify(workspaceName);
    const existingTenant = await this.deps.tenantRepo.findBySlug(slug);
    if (existingTenant) {
      slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    }
    // Create tenant
    const createTenantOpts: CreateTenantDto = {
      name: workspaceName,
      slug,
      status: 'pending_verification',
      plan: 'starter',
    };
    const tenant = await this.deps.tenantRepo.create(createTenantOpts);

    // Create user
    const passwordHash = await this.deps.passwordService.hash(dto.password);
    const createUserOpts: CreateUserDto = {
      email: dto.email,
      passwordHash,
      defaultTenantId: tenant.id,
    };
    const user = await this.deps.userRepo.create(createUserOpts);

    // Create membership
    const membershipOpts: CreateMembershipDto = {
      userId: user.id,
      tenantId: tenant.id,
      role: 'owner',
    };
    const membership = await this.deps.membershipRepo.create(membershipOpts);

    // Create Instagram connection
    const createIgConnectionDto: CreateIgConnectionDto = {
      userId: user.id,
      tenantId: tenant.id,
      igUserId: payload.igUserId,
      igUsername: payload.igUsername,
      igAccountType: payload.accountType,
      accessTokenEnc: payload.accessTokenEnc,
      tokenIv: payload.tokenIv,
      tokenExpiresAt: new Date(payload.tokenExpiresAt),
      scopes: payload.scopes,
      isActive: true,
    };
    await this.deps.instagramRepo.create(createIgConnectionDto);

    // Issue tokens
    const tokenOpts: IssueTokenOpts = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: 'owner',
      tenantStatus: 'pending_verification',
      deviceInfo: {},
    };
    const tokens = await this.deps.tokenService.issueTokens(tokenOpts);

    // Publish events
    await this.deps.eventPublisher.publish('auth.tenant.created', {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    });
    await this.deps.eventPublisher.publish('auth.user.registered', {
      userId: user.id,
      tenantId: tenant.id,
    });

    // Create audit entries
    await this.deps.auditRepo.create({
      eventType: 'tenant.created',
      userId: user.id,
      tenantId: tenant.id,
    });
    await this.deps.auditRepo.create({
      eventType: 'user.registered',
      userId: user.id,
      tenantId: tenant.id,
    });

    return { user, tenant, membership, tokens };
  }

  /**
   * Accept invite: validate invite token, create user if needed, create membership.
   */
  async acceptInvite(dto: AcceptInviteDto): Promise<AcceptInviteResult> {
    const tokenHash = sha256(dto.inviteToken);
    const invitation = await this.deps.invitationRepo.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError('Invalid invitation token', 400);
    }
    if (invitation.acceptedAt) {
      throw new AppError('Invitation already accepted', 400);
    }
    if (invitation.expiresAt < new Date()) {
      throw new AppError('Invitation has expired', 400);
    }

    const tenant = await this.deps.tenantRepo.findById(invitation.tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    let user = await this.deps.userRepo.findByEmail(invitation.email);

    if (!user) {
      // New user — password is required
      if (!dto.password) {
        throw new AppError('Password is required for new users', 400);
      }
      const policyResult = this.deps.passwordService.validatePolicy(dto.password);
      if (!policyResult.valid) {
        throw new AppError(policyResult.errors.join('; '), 400);
      }
      const passwordHash = await this.deps.passwordService.hash(dto.password);
      user = await this.deps.userRepo.create({
        email: invitation.email,
        passwordHash,
        defaultTenantId: tenant.id,
      });
    }

    // Create membership (DB unique constraint on user_id+tenant_id; duplicate throws MembershipAlreadyExistsError)
    const membership = await this.deps.membershipRepo.create({
      userId: user.id,
      tenantId: tenant.id,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await this.deps.invitationRepo.markAccepted(invitation.id);

    // Update default tenant if user has none
    if (!user.defaultTenantId) {
      await this.deps.userRepo.update(user.id, { defaultTenantId: tenant.id });
    }

    // Issue tokens for the new membership
    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: invitation.role,
      tenantStatus: tenant.status,
      deviceInfo: {},
    });

    await this.deps.eventPublisher.publish('auth.invitation.accepted', {
      userId: user.id,
      tenantId: tenant.id,
      invitationId: invitation.id,
    });

    await this.deps.auditRepo.create({
      eventType: 'invitation.accepted',
      userId: user.id,
      tenantId: tenant.id,
    });

    return { user, tenant, membership, tokens };
  }

  /**
   * Login: multi-tenant aware — returns all memberships.
   */
  async login(dto: LoginCredentials): Promise<LoginResult> {
    const user = await this.deps.userRepo.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AccountLockedError();
    }

    const passwordValid = await this.deps.passwordService.verify(
      dto.password,
      user.passwordHash
    );
    if (!passwordValid) {
      throw new InvalidCredentialsError("Invalid password");
    }

    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        throw new AppError('MFA code required', 400);
      }
      if (!user.mfaSecret) {
        throw new AppError('MFA not configured', 400);
      }
      const mfaValid = this.deps.totpService.verify(dto.mfaCode, user.mfaSecret);
      if (!mfaValid) {
        throw new InvalidCredentialsError('Invalid MFA code');
      }
    }

    // Load all active memberships
    const memberships = await this.deps.membershipRepo.findAllByUserId(user.id);
    if (memberships.length === 0) {
      throw new AppError('No active memberships found', 403);
    }

    // Choose tenant: default_tenant_id or first membership
    let currentMembership = memberships[0];
    if (user.defaultTenantId) {
      const defaultMatch = memberships.find(
        (m) => m.tenantId === user.defaultTenantId
      );
      if (defaultMatch) {
        currentMembership = defaultMatch;
      }
    }

    const currentTenant = await this.deps.tenantRepo.findById(currentMembership.tenantId);
    if (!currentTenant) {
      throw new AppError('Tenant not found', 404);
    }

    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: currentTenant.id,
      email: user.email,
      role: currentMembership.role,
      tenantStatus: currentTenant.status,
      deviceInfo: {},
    });

    // Update login stats + default tenant
    await this.deps.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      loginCount: user.loginCount + 1,
      defaultTenantId: currentTenant.id,
    });

    await this.deps.eventPublisher.publish('auth.user.logged_in', {
      userId: user.id,
      tenantId: currentTenant.id,
    });

    await this.deps.auditRepo.create({
      eventType: 'user.logged_in',
      userId: user.id,
      tenantId: currentTenant.id,
    });

    const tenants: MembershipInfo[] = memberships.map((m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenantName,
      tenantSlug: m.tenantSlug,
      tenantStatus: m.tenantStatus as LoginResult['currentTenant']['status'],
      role: m.role,
    }));

    return {
      user,
      tokens,
      currentTenant,
      currentRole: currentMembership.role,
      tenants,
    };
  }

  /**
   * Switch tenant: issue new JWT for a different tenant.
   */
  async switchTenant(userId: string, tenantId: string): Promise<TokenPair> {
    const membership = await this.deps.membershipRepo.findByUserAndTenant(userId, tenantId);
    if (!membership || !membership.isActive) {
      throw new AppError('Not a member of this tenant', 403);
    }

    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tenant = await this.deps.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Update default tenant
    await this.deps.userRepo.update(userId, { defaultTenantId: tenantId });

    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: membership.role,
      tenantStatus: tenant.status,
      deviceInfo: {},
    });

    await this.deps.auditRepo.create({
      eventType: 'tenant.switched',
      userId,
      tenantId,
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string, all = false): Promise<void> {
    if (all) {
      await this.deps.tokenService.revokeAllForUser(userId);
    } else {
      await this.deps.tokenService.revokeToken(refreshToken);
    }

    await this.deps.eventPublisher.publish('auth.user.logged_out', {
      userId,
      all,
    });

    await this.deps.auditRepo.create({
      eventType: 'user.logged_out',
      userId,
      metadata: { all },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.deps.userRepo.findByEmail(email);
    if (!user) {
      return;
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
    await this.deps.oneTimeTokenRepo.create({
      userId: user.id,
      tokenHash,
      type: 'password_reset',
      expiresAt,
    });
    const resetLink = `${this.deps.resetPasswordBaseUrl}?token=${encodeURIComponent(rawToken)}`;
    await this.deps.emailSender.sendResetPasswordEmail(user.email, resetLink);
    await this.deps.auditRepo.create({
      eventType: 'password_reset_requested',
      userId: user.id,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = sha256(token);
    const ott = await this.deps.oneTimeTokenRepo.findByTokenHashAndType(
      tokenHash,
      'password_reset'
    );
    if (!ott || ott.usedAt || ott.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    const policyResult = this.deps.passwordService.validatePolicy(newPassword);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join('; '), 400);
    }
    const passwordHash = await this.deps.passwordService.hash(newPassword);
    await this.deps.userRepo.update(ott.userId, { passwordHash });
    await this.deps.tokenService.revokeAllForUser(ott.userId);
    await this.deps.oneTimeTokenRepo.markUsed(ott.id);
    await this.deps.auditRepo.create({
      eventType: 'password_reset_completed',
      userId: ott.userId,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = sha256(token);
    const ott = await this.deps.oneTimeTokenRepo.findByTokenHashAndType(
      tokenHash,
      'email_verify'
    );
    if (!ott || ott.usedAt || ott.expiresAt < new Date()) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    await this.deps.userRepo.update(ott.userId, { emailVerified: true });
    await this.deps.oneTimeTokenRepo.markUsed(ott.id);
    await this.deps.auditRepo.create({
      eventType: 'email_verified',
      userId: ott.userId,
    });
  }

  /**
   * Get current user profile for GET /me: user, current tenant/role, all memberships, IG connections.
   */
  async getMe(userId: string, tenantId: string): Promise<MeResult> {
    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const [currentTenant, memberships, connections] = await Promise.all([
      this.deps.tenantRepo.findById(tenantId),
      this.deps.membershipRepo.findAllByUserId(userId),
      this.deps.instagramRepo.findByUserId(userId),
    ]);

    const currentMembership = memberships.find((m) => m.tenantId === tenantId);

    return {
      id: user.id,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      currentTenant: currentTenant ?? undefined,
      currentRole: currentMembership?.role ?? undefined,
      memberships: memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        tenantSlug: m.tenantSlug,
        tenantStatus: m.tenantStatus as TenantStatus,
        role: m.role,
      })),
      igConnections: connections.map((c) => ({
        id: c.id,
        igUserId: c.igUserId,
        igUsername: c.igUsername,
        isActive: c.isActive,
      })),
    };
  }
}
