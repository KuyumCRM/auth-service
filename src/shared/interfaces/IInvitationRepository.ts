// Port interface for invitation operations.
import type { Invitation, CreateInvitationDto } from '../../domain/invitation/invitation.types.js';

export interface IInvitationRepository {
  findById(id: string): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findPendingByTenantId(tenantId: string): Promise<Invitation[]>;
  findByEmailAndTenant(email: string, tenantId: string): Promise<Invitation | null>;
  create(data: CreateInvitationDto): Promise<Invitation>;
  markAccepted(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
