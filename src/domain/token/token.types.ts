// JWT and refresh token types per Section 5.1

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  feature_flags: string[];
  jti: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenMeta {
  userId: string;
  familyId: string;
  deviceInfo: Record<string, unknown>;
  expiresAt: Date;
}

/** Stored refresh token entity — maps to auth.refresh_tokens. */
export interface RefreshToken {
  id: string;
  userId: string;
  hash: string; // token_hash
  familyId: string;
  deviceInfo: Record<string, unknown>; // JSONB: { ua, ip, device_name }
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateRefreshTokenDto {
  userId: string;
  familyId: string;
  deviceInfo: Record<string, unknown>;
  expiresAt: Date;
  hash: string;
}

export interface IssueTokenOpts {
  userId: string;
  tenantId: string;
  email: string;
  deviceInfo: Record<string, unknown>;
}

export interface RotateTokenOpts {
  oldHash: string;
  newHash: string;
  expiresAt: Date;
}
