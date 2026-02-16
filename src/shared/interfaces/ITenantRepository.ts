// Port interface for tenant subscription data (tier + feature flags for JWT claims).
import type { SubscriptionTier } from '../../domain/token/token.types.js';

export interface TenantSubscription {
  tenantId: string;
  tier: SubscriptionTier;
  featureFlags: string[];
}

export interface ITenantRepository {
  getSubscription(tenantId: string): Promise<TenantSubscription>;
}
