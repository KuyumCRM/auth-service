// JWT and refresh token types
import type { TenantStatus, TenantPlan, MembershipRole } from '../tenant/tenant.types.js';
import type { ITokenRepository } from '../../shared/interfaces/ITokenRepository.js';
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';

export type { TenantStatus, MembershipRole };

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

/** Access + refresh token pair returned by issueTokens / rotateRefreshToken. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  role: MembershipRole;
  tenant_status: TenantStatus;
  subscription_tier: TenantPlan;
  feature_flags: string[];
  jti: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenMeta {
  userId: string;
  tenantId: string;
  familyId: string;
  deviceInfo: Record<string, unknown>;
  expiresAt: Date;
}

/** Stored refresh token entity — maps to auth.refresh_tokens. */
export interface RefreshToken {
  id: string;
  userId: string;
  tenantId: string;
  hash: string;
  familyId: string;
  deviceInfo: Record<string, unknown>;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateRefreshTokenDto {
  userId: string;
  tenantId: string;
  familyId: string;
  deviceInfo: Record<string, unknown>;
  expiresAt: Date;
  hash: string;
}

export interface IssueTokenOpts {
  userId: string;
  tenantId: string;
  email: string;
  role: MembershipRole;
  tenantStatus: TenantStatus;
  deviceInfo: Record<string, unknown>;
}

export interface RotateTokenOpts {
  oldHash: string;
  newHash: string;
  expiresAt: Date;
}
