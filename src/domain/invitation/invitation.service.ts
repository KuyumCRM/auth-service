// Invitation domain service — create, list, cancel invitations.
import { sha256, generateSecureToken, addDays } from '../../shared/utils/index.js';
import type { Invitation } from './invitation.types.js';
import { INVITE_EXPIRY_DAYS } from '../../config/constants.js';
import { AppError } from '../../shared/errors/domain-errors.js';
import type { CreateInviteInput, InvitationServiceDeps } from './invitation.types.js';

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

    const rawToken = generateSecureToken();
    const tokenHash = sha256(rawToken);
    const expiresAt = addDays(new Date(), INVITE_EXPIRY_DAYS);

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
