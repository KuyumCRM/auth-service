// Invitation domain types — source of truth for invitation entity and DTOs.
import type { MembershipRole } from '../tenant/tenant.types.js';
import type { IInvitationRepository } from '../../shared/interfaces/IInvitationRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';

export interface CreateInviteInput {
  tenantId: string;
  email: string;
  role: MembershipRole;
  invitedBy: string;
}

export interface InvitationServiceDeps {
  invitationRepo: IInvitationRepository;
  membershipRepo: IMembershipRepository;
  userRepo: IUserRepository;
  emailSender: IEmailSender;
  auditRepo: IAuditRepository;
  inviteBaseUrl: string;
}

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
