// Port interface for membership operations.
import type { Membership, CreateMembershipDto, MembershipRole } from '../../domain/auth/auth.types.js';

export interface MembershipWithTenant extends Membership {
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
}

export interface IMembershipRepository {
  findById(id: string): Promise<Membership | null>;
  findByUserAndTenant(userId: string, tenantId: string): Promise<Membership | null>;
  findAllByUserId(userId: string): Promise<MembershipWithTenant[]>;
  findAllByTenantId(tenantId: string): Promise<Membership[]>;
  create(data: CreateMembershipDto): Promise<Membership>;
  updateRole(id: string, role: MembershipRole): Promise<Membership>;
  deactivate(id: string): Promise<void>;
}
