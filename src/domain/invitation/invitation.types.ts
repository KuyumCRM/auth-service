// Invitation domain types — source of truth for invitation entity and DTOs.
import type { MembershipRole } from '../tenant/tenant.types.js';

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: MembershipRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationDto {
  tenantId: string;
  email: string;
  role: MembershipRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}
