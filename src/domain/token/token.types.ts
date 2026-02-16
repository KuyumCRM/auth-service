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
  deviceInfo: string;
  expiresAt: Date;
}
