// Stub tenant repository — returns default tier and empty feature flags.
import type { ITenantRepository, TenantSubscription } from '../../shared/interfaces/ITenantRepository.js';

export function createStubTenantRepository(): ITenantRepository {
  return {
    async getSubscription(tenantId: string): Promise<TenantSubscription> {
      return {
        tenantId,
        tier: 'starter',
        featureFlags: [],
      };
    },
  };
}
