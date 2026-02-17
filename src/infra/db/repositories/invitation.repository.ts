// Invitation repository backed by PostgreSQL.
import type { IInvitationRepository } from '../../../shared/interfaces/IInvitationRepository.js';
import type { MembershipRole } from '../../../domain/tenant/tenant.types.js';
import type { Invitation, CreateInvitationDto } from '../../../domain/invitation/invitation.types.js';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source.js';
import { InvitationEntity } from '../entities/Invitation.entity.js';

function entityToInvitation(entity: InvitationEntity): Invitation {
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    email: entity.email,
    role: entity.role as MembershipRole,
    tokenHash: entity.tokenHash,
    invitedBy: entity.invitedBy,
    expiresAt: entity.expiresAt,
    acceptedAt: entity.acceptedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function createInvitationRepository(): IInvitationRepository {
  const repo = AppDataSource.getRepository(InvitationEntity);

  return {
    async findById(id: string): Promise<Invitation | null> {
      const entity = await repo.findOne({ where: { id } });
      return entity ? entityToInvitation(entity) : null;
    },

    async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
      const entity = await repo.findOne({ where: { tokenHash } });
      return entity ? entityToInvitation(entity) : null;
    },

    async findPendingByTenantId(tenantId: string): Promise<Invitation[]> {
      const entities = await repo.find({
        where: { tenantId, acceptedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      return entities.map(entityToInvitation);
    },

    async findByEmailAndTenant(email: string, tenantId: string): Promise<Invitation | null> {
      const entity = await repo.findOne({
        where: { email, tenantId, acceptedAt: IsNull() },
      });
      return entity ? entityToInvitation(entity) : null;
    },

    async create(data: CreateInvitationDto): Promise<Invitation> {
      const entity = repo.create({
        tenantId: data.tenantId,
        email: data.email,
        role: data.role,
        tokenHash: data.tokenHash,
        invitedBy: data.invitedBy,
        expiresAt: data.expiresAt,
      });
      const saved = await repo.save(entity);
      return entityToInvitation(saved);
    },

    async markAccepted(id: string): Promise<void> {
      await repo.update({ id }, { acceptedAt: new Date() });
    },

    async delete(id: string): Promise<void> {
      await repo.delete({ id });
    },
  };
}
