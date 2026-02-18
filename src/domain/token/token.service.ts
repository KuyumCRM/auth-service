// JWT creation, validation, refresh token rotation with reuse detection.
import * as crypto from 'crypto';
import { sha256, addDays } from '../../shared/utils/index.js';
import {
  SignJWT,
  importPKCS8,
  type CryptoKey,
} from 'jose';
import type { TokenPair } from './token.types.js';
import type {
  IssueTokenOpts,
  CreateRefreshTokenDto,
  RotateTokenOpts,
} from './token.types.js';
import type { TenantPlan, TenantStatus, MembershipRole } from '../tenant/tenant.types.js';
import { JWT_ALGORITHM_RS256 } from '../../config/constants.js';
import {
  InvalidTokenError,
  TokenExpiredError,
  TokenReuseDetectedError,
} from '../../shared/errors/domain-errors.js';
import type { TokenServiceConfig, TokenServiceDeps } from './token.types.js';

export type { TokenServiceConfig, TokenServiceDeps };

export class TokenService {
  constructor(private readonly deps: TokenServiceDeps) {}

  private privateKey: CryptoKey | null = null;

  private async getPrivateKey(): Promise<CryptoKey> {
    if (!this.privateKey) {
      this.privateKey = await importPKCS8(this.deps.config.privateKeyPem, JWT_ALGORITHM_RS256);
    }
    return this.privateKey;
  }

  private async buildAccessToken(claims: {
    sub: string;
    tenantId: string;
    email: string;
    role: MembershipRole;
    tenantStatus: TenantStatus;
    plan: TenantPlan;
    featureFlags: string[];
  }): Promise<string> {
    const jti = crypto.randomUUID();
    const now = new Date();
    const exp = Math.floor(now.getTime() / 1000) + this.deps.config.accessTtlSec;
    const iat = Math.floor(now.getTime() / 1000);
    const privateKey = await this.getPrivateKey();
    return new SignJWT({
      tenant_id: claims.tenantId,
      email: claims.email,
      role: claims.role,
      tenant_status: claims.tenantStatus,
      subscription_tier: claims.plan,
      feature_flags: claims.featureFlags,
    })
      .setSubject(claims.sub)
      .setJti(jti)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: JWT_ALGORITHM_RS256 })
      .sign(privateKey);
  }

  async issueTokens(opts: IssueTokenOpts): Promise<TokenPair> {
    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const familyId = crypto.randomUUID();
    const tokenHash = sha256(rawRefresh);
    const now = new Date();
    const expiresAt = addDays(now, this.deps.config.refreshTtlDays);

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
    const accessToken = await this.buildAccessToken({
      sub: opts.userId,
      tenantId: opts.tenantId,
      email: opts.email,
      role: opts.role,
      tenantStatus: opts.tenantStatus,
      plan: subscription.plan,
      featureFlags: subscription.featureFlags,
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
    const tokenHash = sha256(rawToken);
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
    const newHash = sha256(newRawToken);
    const expiresAt = addDays(new Date(), this.deps.config.refreshTtlDays);

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

    const accessToken = await this.buildAccessToken({
      sub: rotated.userId,
      tenantId,
      email: user.email,
      role: membership.role ?? 'viewer',
      tenantStatus: subscription.status,
      plan: subscription.plan,
      featureFlags: subscription.featureFlags,
    });

    return { accessToken, refreshToken: newRawToken };
  }

  async revokeToken(rawToken: string): Promise<void> {
    const tokenHash = sha256(rawToken);
    const existing = await this.deps.tokenRepo.findByHash(tokenHash);
    if (existing) {
      await this.deps.tokenRepo.revokeFamilyById(existing.familyId);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.deps.tokenRepo.revokeAllForUser(userId);
  }
}
