// JWT and refresh token types
import type { TenantStatus, TenantPlan, MembershipRole } from '../tenant/tenant.types.js';

/** Alias for JWT payload; same as TenantPlan. */
export type SubscriptionTier = TenantPlan;

export type { TenantStatus, MembershipRole };

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  role: MembershipRole;
  tenant_status: TenantStatus;
  subscription_tier: SubscriptionTier;
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
