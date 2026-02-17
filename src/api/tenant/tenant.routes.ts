// Tenant management routes — all require authentication + owner/admin role.
import type { FastifyInstance } from 'fastify';
import {
  ROUTE_TENANT_INVITE,
  ROUTE_TENANT_INVITATIONS,
  ROUTE_TENANT_MEMBERS,
} from '../../config/constants.js';
import { createRoleGuard } from '../../shared/guards/role.guard.js';
import {
  getTenantResponse200,
  updateTenantBody,
  updateTenantResponse200,
  inviteBody,
  inviteResponse201,
  listInvitationsResponse200,
  listMembersResponse200,
  updateRoleBody,
  updateRoleResponse200,
} from './tenant.schema.js';
import {
  getTenant,
  updateTenant,
  invite,
  listInvitations,
  cancelInvitation,
  listMembers,
  updateMemberRole,
  removeMember,
} from './tenant.controller.js';

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  const guard = app.authenticateGuard!;
  const ownerOrAdmin = createRoleGuard('owner', 'admin');
  const ownerOnly = createRoleGuard('owner');

  // GET /tenant — any authenticated member
  app.get('/', {
    preHandler: [guard],
    schema: {
      response: { 200: getTenantResponse200 },
    },
    handler: getTenant,
  });

  // PATCH /tenant — owner/admin only
  app.patch('/', {
    preHandler: [guard, ownerOrAdmin],
    schema: {
      body: updateTenantBody,
      response: { 200: updateTenantResponse200 },
    },
    handler: updateTenant,
  });

  // POST /tenant/invite — owner/admin only
  app.post(ROUTE_TENANT_INVITE, {
    preHandler: [guard, ownerOrAdmin],
    schema: {
      body: inviteBody,
      response: { 201: inviteResponse201 },
    },
    handler: invite,
  });

  // GET /tenant/invitations — owner/admin only
  app.get(ROUTE_TENANT_INVITATIONS, {
    preHandler: [guard, ownerOrAdmin],
    schema: {
      response: { 200: listInvitationsResponse200 },
    },
    handler: listInvitations,
  });

  // DELETE /tenant/invitations/:id — owner/admin only
  app.delete<{ Params: { id: string } }>(`${ROUTE_TENANT_INVITATIONS}/:id`, {
    preHandler: [guard, ownerOrAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 204: { type: 'null', description: 'No content' } },
    },
    handler: cancelInvitation,
  });

  // GET /tenant/members — owner/admin only
  app.get(ROUTE_TENANT_MEMBERS, {
    preHandler: [guard, ownerOrAdmin],
    schema: {
      response: { 200: listMembersResponse200 },
    },
    handler: listMembers,
  });

  // PATCH /tenant/members/:id/role — owner only
  app.patch<{ Params: { id: string }; Body: { role: string } }>(`${ROUTE_TENANT_MEMBERS}/:id/role`, {
    preHandler: [guard, ownerOnly],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: updateRoleBody,
      response: { 200: updateRoleResponse200 },
    },
    handler: updateMemberRole,
  });

  // DELETE /tenant/members/:id — owner/admin only
  app.delete<{ Params: { id: string } }>(`${ROUTE_TENANT_MEMBERS}/:id`, {
    preHandler: [guard, ownerOrAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 204: { type: 'null', description: 'No content' } },
    },
    handler: removeMember,
  });
}
