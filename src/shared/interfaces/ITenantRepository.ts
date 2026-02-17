// Port interface for tenant CRUD + subscription data.
import type {
  Tenant,
  CreateTenantDto,
  TenantStatus,
  TenantSubscription,
} from '../../domain/tenant/tenant.types.js';

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  create(data: CreateTenantDto): Promise<Tenant>;
  update(id: string, data: Partial<Tenant>): Promise<Tenant>;
  updateStatus(id: string, status: TenantStatus): Promise<Tenant>;
  getSubscription(tenantId: string): Promise<TenantSubscription>;
}
