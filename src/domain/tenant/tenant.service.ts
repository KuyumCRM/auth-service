// Tenant management domain service.
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';
import type { Tenant, Membership, MembershipRole } from '../auth/auth.types.js';
import { AppError } from '../auth/auth.errors.js';

export interface TenantServiceDeps {
  tenantRepo: ITenantRepository;
  membershipRepo: IMembershipRepository;
  eventPublisher: IEventPublisher;
  auditRepo: IAuditRepository;
}

export class TenantService {
  constructor(private readonly deps: TenantServiceDeps) {}

  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.deps.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }
    return tenant;
  }

  async updateTenantName(
    tenantId: string,
    name: string,
    userId: string
  ): Promise<Tenant> {
    const tenant = await this.deps.tenantRepo.update(tenantId, { name });

    await this.deps.auditRepo.create({
      eventType: 'tenant.updated',
      userId,
      tenantId,
      metadata: { name },
    });

    return tenant;
  }

  async getMembers(tenantId: string): Promise<Membership[]> {
    return this.deps.membershipRepo.findAllByTenantId(tenantId);
  }

  async updateMemberRole(
    membershipId: string,
    role: MembershipRole,
    actorUserId: string,
    tenantId: string
  ): Promise<Membership> {
    const membership = await this.deps.membershipRepo.findById(membershipId);
    if (!membership || membership.tenantId !== tenantId) {
      throw new AppError('Membership not found', 404);
    }
    if (membership.role === 'owner') {
      throw new AppError('Cannot change owner role', 403);
    }

    const updated = await this.deps.membershipRepo.updateRole(membershipId, role);

    await this.deps.auditRepo.create({
      eventType: 'membership.role_changed',
      userId: actorUserId,
      tenantId,
      metadata: { membershipId, newRole: role },
    });

    return updated;
  }

  async removeMember(
    membershipId: string,
    actorUserId: string,
    tenantId: string
  ): Promise<void> {
    const membership = await this.deps.membershipRepo.findById(membershipId);
    if (!membership || membership.tenantId !== tenantId) {
      throw new AppError('Membership not found', 404);
    }
    if (membership.role === 'owner') {
      throw new AppError('Cannot remove the owner', 403);
    }
    if (membership.userId === actorUserId) {
      throw new AppError('Cannot remove yourself', 403);
    }

    await this.deps.membershipRepo.deactivate(membershipId);

    await this.deps.auditRepo.create({
      eventType: 'membership.removed',
      userId: actorUserId,
      tenantId,
      metadata: { membershipId, removedUserId: membership.userId },
    });
  }

  /**
   * Called when Instagram verification completes — activates the tenant.
   */
  async activateTenant(
    tenantId: string,
    userId: string
  ): Promise<Tenant> {
    const tenant = await this.deps.tenantRepo.updateStatus(tenantId, 'active');

    await this.deps.eventPublisher.publish('auth.tenant.verified', {
      tenantId,
    });

    await this.deps.auditRepo.create({
      eventType: 'tenant.verified',
      userId,
      tenantId,
    });

    return tenant;
  }
}
