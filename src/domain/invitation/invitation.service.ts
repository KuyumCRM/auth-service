// Invitation domain service — create, list, cancel invitations.
import * as crypto from 'crypto';
import type { IInvitationRepository } from '../../shared/interfaces/IInvitationRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';
import type { MembershipRole } from '../tenant/tenant.types.js';
import type { Invitation } from './invitation.types.js';
import { INVITE_EXPIRY_DAYS } from '../../config/constants.js';
import { AppError } from '../auth/auth.errors.js';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

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

export class InvitationService {
  constructor(private readonly deps: InvitationServiceDeps) {}

  async createInvitation(input: CreateInviteInput): Promise<Invitation> {
    // Check if user with this email is already a member of this tenant
    const existingUser = await this.deps.userRepo.findByEmail(input.email);
    if (existingUser) {
      const existingMembership = await this.deps.membershipRepo.findByUserAndTenant(
        existingUser.id,
        input.tenantId
      );
      if (existingMembership) {
        throw new AppError('Already a member of this tenant', 409);
      }
    }

    const existingInvite = await this.deps.invitationRepo.findByEmailAndTenant(
      input.email,
      input.tenantId
    );
    if (existingInvite && !existingInvite.acceptedAt && existingInvite.expiresAt > new Date()) {
      throw new AppError('An active invitation already exists for this email', 409);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invitation = await this.deps.invitationRepo.create({
      tenantId: input.tenantId,
      email: input.email,
      role: input.role,
      tokenHash,
      invitedBy: input.invitedBy,
      expiresAt,
    });

    // Send invite email
    const inviteLink = `${this.deps.inviteBaseUrl}?token=${encodeURIComponent(rawToken)}`;
    await this.deps.emailSender.sendInviteEmail(input.email, inviteLink);

    await this.deps.auditRepo.create({
      eventType: 'invitation.created',
      userId: input.invitedBy,
      tenantId: input.tenantId,
      metadata: { email: input.email, role: input.role },
    });

    return invitation;
  }

  async listPendingInvitations(tenantId: string): Promise<Invitation[]> {
    return this.deps.invitationRepo.findPendingByTenantId(tenantId);
  }

  async cancelInvitation(
    invitationId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const invitation = await this.deps.invitationRepo.findById(invitationId);
    if (!invitation || invitation.tenantId !== tenantId) {
      throw new AppError('Invitation not found', 404);
    }
    if (invitation.acceptedAt) {
      throw new AppError('Invitation already accepted', 400);
    }

    await this.deps.invitationRepo.delete(invitationId);

    await this.deps.auditRepo.create({
      eventType: 'invitation.cancelled',
      userId,
      tenantId,
      metadata: { invitationId, email: invitation.email },
    });
  }
}
