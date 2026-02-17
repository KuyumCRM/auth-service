// JWT creation, validation, refresh token rotation with reuse detection.
import * as crypto from 'crypto';
import {
  SignJWT,
  importPKCS8,
  type CryptoKey,
} from 'jose';
import type { ITokenRepository } from '../../shared/interfaces/ITokenRepository.js';
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { TokenPair } from '../auth/auth.types.js';
import type {
  IssueTokenOpts,
  CreateRefreshTokenDto,
  RotateTokenOpts,
} from './token.types.js';
import { JWT_ALGORITHM_RS256 } from '../../config/constants.js';
import {
  InvalidTokenError,
  TokenExpiredError,
  TokenReuseDetectedError,
} from '../auth/auth.errors.js';

export interface TokenServiceConfig {
  privateKeyPem: string;
  publicKeyPem: string;
  accessTtlSec: number;
  refreshTtlDays: number;
}

export interface TokenServiceDeps {
  tokenRepo: ITokenRepository;
  tenantRepo: ITenantRepository;
  userRepo: IUserRepository;
  membershipRepo: IMembershipRepository;
  eventPublisher: IEventPublisher;
  config: TokenServiceConfig;
}

export class TokenService {
  constructor(private readonly deps: TokenServiceDeps) {}

  private static sha256(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private privateKey: CryptoKey | null = null;

  private async getPrivateKey(): Promise<CryptoKey> {
    if (!this.privateKey) {
      this.privateKey = await importPKCS8(this.deps.config.privateKeyPem, JWT_ALGORITHM_RS256);
    }
    return this.privateKey;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async issueTokens(opts: IssueTokenOpts): Promise<TokenPair> {
    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const familyId = crypto.randomUUID();
    const tokenHash = TokenService.sha256(rawRefresh);
    const now = new Date();
    const expiresAt = this.addDays(now, this.deps.config.refreshTtlDays);

    const createDto: CreateRefreshTokenDto = {
      userId: opts.userId,
      tenantId: opts.tenantId,
      familyId,
      hash: tokenHash,
      deviceInfo: opts.deviceInfo,
      expiresAt,
    };
    await this.deps.tokenRepo.create(createDto);

    const subscription = await this.deps.tenantRepo.getSubscription(opts.tenantId);
    const jti = crypto.randomUUID();
    const exp = Math.floor(now.getTime() / 1000) + this.deps.config.accessTtlSec;
    const iat = Math.floor(now.getTime() / 1000);

    const privateKey = await this.getPrivateKey();
    const accessToken = await new SignJWT({
      tenant_id: opts.tenantId,
      email: opts.email,
      role: opts.role,
      tenant_status: opts.tenantStatus,
      subscription_tier: subscription.plan,
      feature_flags: subscription.featureFlags,
    })
      .setSubject(opts.userId)
      .setJti(jti)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: JWT_ALGORITHM_RS256 })
      .sign(privateKey);

    return { accessToken, refreshToken: rawRefresh };
  }

  async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
    const tokenHash = TokenService.sha256(rawToken);
    const existing = await this.deps.tokenRepo.findByHash(tokenHash);

    if (!existing) {
      throw new InvalidTokenError();
    }

    if (existing.rotatedAt || existing.revokedAt) {
      await this.deps.tokenRepo.revokeFamilyById(existing.familyId);
      await this.deps.eventPublisher.publish('auth.token.family_revoked', {
        userId: existing.userId,
        reason: 'reuse_detected',
      });
      throw new TokenReuseDetectedError();
    }

    if (existing.expiresAt < new Date()) {
      throw new TokenExpiredError();
    }

    const newRawToken = crypto.randomBytes(64).toString('hex');
    const newHash = TokenService.sha256(newRawToken);
    const expiresAt = this.addDays(new Date(), this.deps.config.refreshTtlDays);

    const rotateOpts: RotateTokenOpts = {
      oldHash: tokenHash,
      newHash,
      expiresAt,
    };
    const rotated = await this.deps.tokenRepo.rotateToken(rotateOpts);

    const tenantId = rotated.tenantId;
    const subscription = await this.deps.tenantRepo.getSubscription(tenantId);
    if (!subscription) {
      throw new InvalidTokenError("Tenant not found in the database");
    }

    const user = await this.deps.userRepo.findById(rotated.userId);
    if (!user) {
      throw new InvalidTokenError("User not found in the database");
    }

    const membership = await this.deps.membershipRepo.findByUserAndTenant(user.id, tenantId);
    if (!membership) {
      throw new InvalidTokenError("User is not a member of this tenant");
    }
    
    const jti = crypto.randomUUID();
    const now = new Date();
    const exp = Math.floor(now.getTime() / 1000) + this.deps.config.accessTtlSec;
    const iat = Math.floor(now.getTime() / 1000);

    const privateKey = await this.getPrivateKey();
    const accessToken = await new SignJWT({
      tenant_id: tenantId,
      email: user.email,
      role: membership?.role ?? 'viewer',
      tenant_status: subscription.status,
      subscription_tier: subscription.plan,
      feature_flags: subscription.featureFlags,
    })
      .setSubject(rotated.userId)
      .setJti(jti)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: JWT_ALGORITHM_RS256 })
      .sign(privateKey);

    return { accessToken, refreshToken: newRawToken };
  }

  async revokeToken(rawToken: string): Promise<void> {
    const tokenHash = TokenService.sha256(rawToken);
    const existing = await this.deps.tokenRepo.findByHash(tokenHash);
    if (existing) {
      await this.deps.tokenRepo.revokeFamilyById(existing.familyId);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.deps.tokenRepo.revokeAllForUser(userId);
  }
}
