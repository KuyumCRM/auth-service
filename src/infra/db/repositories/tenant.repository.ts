// Real tenant repository backed by PostgreSQL.
import type { ITenantRepository } from '../../../shared/interfaces/ITenantRepository.js';
import type { TenantSubscription } from '../../../domain/tenant/tenant.types.js';
import type { Tenant, CreateTenantDto, TenantStatus } from '../../../domain/auth/auth.types.js';
import { AppDataSource } from '../data-source.js';
import { TenantEntity } from '../entities/Tenant.entity.js';

function entityToTenant(entity: TenantEntity): Tenant {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    status: entity.status as TenantStatus,
    plan: entity.plan as Tenant['plan'],
    featureFlags: entity.featureFlags,
    igVerifiedAt: entity.igVerifiedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function createTenantRepository(): ITenantRepository {
  const repository = AppDataSource.getRepository(TenantEntity);

  return {
    async findById(id: string): Promise<Tenant | null> {
      const entity = await repository.findOne({ where: { id } });
      return entity ? entityToTenant(entity) : null;
    },

    async findBySlug(slug: string): Promise<Tenant | null> {
      const entity = await repository.findOne({ where: { slug } });
      return entity ? entityToTenant(entity) : null;
    },

    async create(data: CreateTenantDto): Promise<Tenant> {
      const entity = repository.create({
        name: data.name,
        slug: data.slug,
        status: data.status ?? 'pending_verification',
        plan: data.plan ?? 'starter',
        featureFlags: data.featureFlags ?? [],
      });
      const saved = await repository.save(entity);
      return entityToTenant(saved);
    },

    async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
      const updateData: Partial<TenantEntity> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.plan !== undefined) updateData.plan = data.plan;
      if (data.featureFlags !== undefined) updateData.featureFlags = data.featureFlags;
      if (data.igVerifiedAt !== undefined) updateData.igVerifiedAt = data.igVerifiedAt;

      const result = await repository.update({ id }, updateData);
      if (result.affected === 0) {
        throw new Error(`Tenant not found: ${id}`);
      }
      const entity = await repository.findOne({ where: { id } });
      if (!entity) throw new Error(`Tenant not found: ${id}`);
      return entityToTenant(entity);
    },

    async updateStatus(id: string, status: TenantStatus): Promise<Tenant> {
      const updateData: Partial<TenantEntity> = { status };
      if (status === 'active') {
        updateData.igVerifiedAt = new Date();
      }
      await repository.update({ id }, updateData);
      const entity = await repository.findOne({ where: { id } });
      if (!entity) throw new Error(`Tenant not found: ${id}`);
      return entityToTenant(entity);
    },

    async getSubscription(tenantId: string): Promise<TenantSubscription> {
      const entity = await repository.findOne({ where: { id: tenantId } });
      if (!entity) {
        return {
          tenantId,
          plan: 'starter',
          status: 'pending_verification',
          featureFlags: [],
        };
      }
      return {
        tenantId: entity.id,
        plan: entity.plan as TenantSubscription['plan'],
        status: entity.status as TenantSubscription['status'],
        featureFlags: entity.featureFlags,
      };
    },
  };
}
