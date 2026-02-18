// Tenant HTTP handlers — thin layer over domain services.
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from '../../domain/token/token.types.js';
import type { MembershipRole } from '../../domain/tenant/tenant.types.js';

export async function getTenant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantService = request.server.tenantService!;
  const tenantId = (request.user as JwtPayload).tenant_id;
  const tenant = await tenantService.getTenant(tenantId);
  reply.status(200).send(tenant);
}

export async function updateTenant(
  request: FastifyRequest<{ Body: { name: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantService = request.server.tenantService!;
  const user = request.user as JwtPayload;
  const tenant = await tenantService.updateTenantName(
    user.tenant_id,
    request.body.name,
    user.sub
  );
  reply.status(200).send(tenant);
}

export async function invite(
  request: FastifyRequest<{ Body: { email: string; role: string } }>,
  reply: FastifyReply
): Promise<void> {
  const invitationService = request.server.invitationService!;
  const user = request.user as JwtPayload;
  const invitation = await invitationService.createInvitation({
    tenantId: user.tenant_id,
    email: request.body.email,
    role: request.body.role as MembershipRole,
    invitedBy: user.sub,
  });
  reply.status(201).send(invitation);
}

export async function listInvitations(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const invitationService = request.server.invitationService!;
  const tenantId = (request.user as JwtPayload).tenant_id;
  const invitations = await invitationService.listPendingInvitations(tenantId);
  reply.status(200).send(invitations);
}

export async function cancelInvitation(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const invitationService = request.server.invitationService!;
  const user = request.user as JwtPayload;
  await invitationService.cancelInvitation(
    request.params.id,
    user.tenant_id,
    user.sub
  );
  reply.status(204).send();
}

export async function listMembers(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantService = request.server.tenantService!;
  const tenantId = (request.user as JwtPayload).tenant_id;
  const members = await tenantService.getMembers(tenantId);
  reply.status(200).send(members);
}

export async function updateMemberRole(
  request: FastifyRequest<{ Params: { id: string }; Body: { role: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantService = request.server.tenantService!;
  const user = request.user as JwtPayload;
  const membership = await tenantService.updateMemberRole(
    request.params.id,
    request.body.role as MembershipRole,
    user.sub,
    user.tenant_id
  );
  reply.status(200).send(membership);
}

export async function removeMember(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantService = request.server.tenantService!;
  const user = request.user as JwtPayload;
  await tenantService.removeMember(
    request.params.id,
    user.sub,
    user.tenant_id
  );
  reply.status(204).send();
}
