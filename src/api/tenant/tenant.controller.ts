// Tenant HTTP handlers — thin layer over domain services.
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ERROR_CODE_APP_ERROR,
  ERROR_CODE_INTERNAL,
  ERROR_MSG_INTERNAL_SERVER,
} from '../../config/constants.js';
import type { JwtPayload } from '../../domain/token/token.types.js';
import type { MembershipRole } from '../../domain/auth/auth.types.js';
import { AppError } from '../../domain/auth/auth.errors.js';

function handleError(reply: FastifyReply, err: unknown): void {
  if (err instanceof AppError) {
    reply.status(err.statusCode).send({ error: err.message, code: ERROR_CODE_APP_ERROR });
    return;
  }
  reply.status(500).send({ error: ERROR_MSG_INTERNAL_SERVER, code: ERROR_CODE_INTERNAL });
}

export async function getTenant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const tenantService = request.server.tenantService!;
    const tenantId = (request.user as JwtPayload).tenant_id;
    const tenant = await tenantService.getTenant(tenantId);
    reply.status(200).send(tenant);
  } catch (err) {
    handleError(reply, err);
  }
}

export async function updateTenant(
  request: FastifyRequest<{ Body: { name: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const tenantService = request.server.tenantService!;
    const user = request.user as JwtPayload;
    const tenant = await tenantService.updateTenantName(
      user.tenant_id,
      request.body.name,
      user.sub
    );
    reply.status(200).send(tenant);
  } catch (err) {
    handleError(reply, err);
  }
}

export async function invite(
  request: FastifyRequest<{ Body: { email: string; role: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const invitationService = request.server.invitationService!;
    const user = request.user as JwtPayload;
    const invitation = await invitationService.createInvitation({
      tenantId: user.tenant_id,
      email: request.body.email,
      role: request.body.role as MembershipRole,
      invitedBy: user.sub,
    });
    reply.status(201).send(invitation);
  } catch (err) {
    handleError(reply, err);
  }
}

export async function listInvitations(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const invitationService = request.server.invitationService!;
    const tenantId = (request.user as JwtPayload).tenant_id;
    const invitations = await invitationService.listPendingInvitations(tenantId);
    reply.status(200).send(invitations);
  } catch (err) {
    handleError(reply, err);
  }
}

export async function cancelInvitation(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const invitationService = request.server.invitationService!;
    const user = request.user as JwtPayload;
    await invitationService.cancelInvitation(
      request.params.id,
      user.tenant_id,
      user.sub
    );
    reply.status(204).send();
  } catch (err) {
    handleError(reply, err);
  }
}

export async function listMembers(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const tenantService = request.server.tenantService!;
    const tenantId = (request.user as JwtPayload).tenant_id;
    const members = await tenantService.getMembers(tenantId);
    reply.status(200).send(members);
  } catch (err) {
    handleError(reply, err);
  }
}

export async function updateMemberRole(
  request: FastifyRequest<{ Params: { id: string }; Body: { role: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const tenantService = request.server.tenantService!;
    const user = request.user as JwtPayload;
    const membership = await tenantService.updateMemberRole(
      request.params.id,
      request.body.role as MembershipRole,
      user.sub,
      user.tenant_id
    );
    reply.status(200).send(membership);
  } catch (err) {
    handleError(reply, err);
  }
}

export async function removeMember(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const tenantService = request.server.tenantService!;
    const user = request.user as JwtPayload;
    await tenantService.removeMember(
      request.params.id,
      user.sub,
      user.tenant_id
    );
    reply.status(204).send();
  } catch (err) {
    handleError(reply, err);
  }
}
