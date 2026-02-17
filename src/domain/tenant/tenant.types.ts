// Tenant domain types — source of truth for tenant and plan/role enums.

export type TenantStatus = 'pending_verification' | 'active' | 'suspended';
export type TenantPlan = 'starter' | 'pro' | 'enterprise';
export type MembershipRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  featureFlags: string[];
  igVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  featureFlags?: string[];
}
