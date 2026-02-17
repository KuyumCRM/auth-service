// Fastify JSON schemas for tenant endpoints.

const tenantSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    status: { type: 'string', enum: ['pending_verification', 'active', 'suspended'] },
    plan: { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
    featureFlags: { type: 'array', items: { type: 'string' } },
    igVerifiedAt: { type: ['string', 'null'], format: 'date-time' },
  },
  additionalProperties: false,
} as const;

const memberSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['owner', 'admin', 'editor', 'viewer'] },
    isActive: { type: 'boolean' },
    joinedAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
} as const;

const invitationSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
    invitedBy: { type: 'string', format: 'uuid' },
    expiresAt: { type: 'string', format: 'date-time' },
    acceptedAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
} as const;

// GET /tenant
export const getTenantResponse200 = tenantSafe;

// PATCH /tenant
export const updateTenantBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
  },
  additionalProperties: false,
} as const;

export const updateTenantResponse200 = tenantSafe;

// POST /tenant/invite
export const inviteBody = {
  type: 'object',
  required: ['email', 'role'],
  properties: {
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
  },
  additionalProperties: false,
} as const;

export const inviteResponse201 = invitationSafe;

// GET /tenant/invitations
export const listInvitationsResponse200 = {
  type: 'array',
  items: invitationSafe,
} as const;

// GET /tenant/members
export const listMembersResponse200 = {
  type: 'array',
  items: memberSafe,
} as const;

// PATCH /tenant/members/:id/role
export const updateRoleBody = {
  type: 'object',
  required: ['role'],
  properties: {
    role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
  },
  additionalProperties: false,
} as const;

export const updateRoleResponse200 = memberSafe;
