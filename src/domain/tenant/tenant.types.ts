// Tenant domain types — source of truth for tenant and plan/role enums.
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';

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

export interface TenantSubscription {
  tenantId: string;
  plan: TenantPlan;
  status: TenantStatus;
  featureFlags: string[];
}

export interface TenantServiceDeps {
  tenantRepo: ITenantRepository;
  membershipRepo: IMembershipRepository;
  eventPublisher: IEventPublisher;
  auditRepo: IAuditRepository;
}
