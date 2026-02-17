// Membership repository backed by PostgreSQL.
import type { IMembershipRepository, MembershipWithTenant } from '../../../shared/interfaces/IMembershipRepository.js';
import type { Membership, CreateMembershipDto, MembershipRole } from '../../../domain/auth/auth.types.js';
import { AppDataSource } from '../data-source.js';
import { MembershipEntity } from '../entities/Membership.entity.js';
import { TenantEntity } from '../entities/Tenant.entity.js';

function entityToMembership(entity: MembershipEntity): Membership {
  return {
    id: entity.id,
    userId: entity.userId,
    tenantId: entity.tenantId,
    role: entity.role as MembershipRole,
    isActive: entity.isActive,
    joinedAt: entity.joinedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function createMembershipRepository(): IMembershipRepository {
  const repository = AppDataSource.getRepository(MembershipEntity);

  return {
    async findById(id: string): Promise<Membership | null> {
      const entity = await repository.findOne({ where: { id } });
      return entity ? entityToMembership(entity) : null;
    },

    async findByUserAndTenant(userId: string, tenantId: string): Promise<Membership | null> {
      const entity = await repository.findOne({ where: { userId, tenantId } });
      return entity ? entityToMembership(entity) : null;
    },

    async findAllByUserId(userId: string): Promise<MembershipWithTenant[]> {
      const rows = await repository
        .createQueryBuilder('m')
        .innerJoin(TenantEntity, 't', 't.id = m.tenant_id')
        .select([
          'm.id AS id',
          'm.user_id AS "userId"',
          'm.tenant_id AS "tenantId"',
          'm.role AS role',
          'm.is_active AS "isActive"',
          'm.joined_at AS "joinedAt"',
          'm.created_at AS "createdAt"',
          'm.updated_at AS "updatedAt"',
          't.name AS "tenantName"',
          't.slug AS "tenantSlug"',
          't.status AS "tenantStatus"',
        ])
        .where('m.user_id = :userId', { userId })
        .andWhere('m.is_active = true')
        .getRawMany();

      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        tenantId: r.tenantId,
        role: r.role as MembershipRole,
        isActive: r.isActive,
        joinedAt: r.joinedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        tenantName: r.tenantName,
        tenantSlug: r.tenantSlug,
        tenantStatus: r.tenantStatus,
      }));
    },

    async findAllByTenantId(tenantId: string): Promise<Membership[]> {
      const entities = await repository.find({ where: { tenantId, isActive: true } });
      return entities.map(entityToMembership);
    },

    async create(data: CreateMembershipDto): Promise<Membership> {
      const entity = repository.create({
        userId: data.userId,
        tenantId: data.tenantId,
        role: data.role,
      });
      const saved = await repository.save(entity);
      return entityToMembership(saved);
    },

    async updateRole(id: string, role: MembershipRole): Promise<Membership> {
      await repository.update({ id }, { role });
      const entity = await repository.findOne({ where: { id } });
      if (!entity) throw new Error(`Membership not found: ${id}`);
      return entityToMembership(entity);
    },

    async deactivate(id: string): Promise<void> {
      await repository.update({ id }, { isActive: false });
    },
  };
}
