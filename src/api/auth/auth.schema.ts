// Fastify JSON schema for auth request bodies and responses.

const email = { type: 'string', format: 'email' } as const;
const password = { type: 'string', minLength: 12 };
const token = { type: 'string', minLength: 1 };
const mfaCode = { type: 'string', minLength: 6, maxLength: 6 };

const tenantSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    status: { type: 'string' },
    plan: { type: 'string' },
    featureFlags: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

const membershipInfo = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    tenantName: { type: 'string' },
    tenantSlug: { type: 'string' },
    tenantStatus: { type: 'string' },
    role: { type: 'string', enum: ['owner', 'admin', 'editor', 'viewer'] },
  },
  additionalProperties: false,
} as const;

const userSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email,
    mfaEnabled: { type: 'boolean' },
    emailVerified: { type: 'boolean' },
    isActive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

// POST /signup (Instagram-first: requires onboarding token from onboard-callback)
export const signupBody = {
  type: 'object',
  required: ['onboardingToken', 'email', 'password'],
  properties: {
    onboardingToken: { type: 'string', minLength: 1 },
    email,
    password,
    workspaceName: { type: 'string', minLength: 1, maxLength: 100 },
  },
  additionalProperties: false,
} as const;

export const signupResponse201 = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user', 'tenant'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: userSafe,
    tenant: tenantSafe,
  },
  additionalProperties: false,
} as const;

// POST /create-workspace (optional auth: JWT or body credentials)
export const createWorkspaceBody = {
  type: 'object',
  required: ['onboardingToken'],
  properties: {
    onboardingToken: { type: 'string', minLength: 1 },
    workspaceName: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
    mfaCode: { type: 'string', minLength: 6, maxLength: 6 },
  },
  additionalProperties: false,
} as const;

export const createWorkspaceResponse201 = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user', 'tenant'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: userSafe,
    tenant: tenantSafe,
  },
  additionalProperties: false,
} as const;

// POST /accept-invite
export const acceptInviteBody = {
  type: 'object',
  required: ['inviteToken'],
  properties: {
    inviteToken: { type: 'string', minLength: 1 },
    password,
  },
  additionalProperties: false,
} as const;

export const acceptInviteResponse201 = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user', 'tenant'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: userSafe,
    tenant: tenantSafe,
  },
  additionalProperties: false,
} as const;

// POST /login
export const loginBody = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email,
    password: { type: 'string', minLength: 1 },
    mfaCode,
  },
  additionalProperties: false,
} as const;

export const loginResponse200 = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user', 'tenants'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: userSafe,
    currentTenant: tenantSafe,
    currentRole: { type: 'string', enum: ['owner', 'admin', 'editor', 'viewer'] },
    tenants: { type: 'array', items: membershipInfo },
  },
  additionalProperties: false,
} as const;

// POST /switch-tenant
export const switchTenantBody = {
  type: 'object',
  required: ['tenantId'],
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
  },
  additionalProperties: false,
} as const;

export const switchTenantResponse200 = {
  type: 'object',
  required: ['accessToken', 'refreshToken'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
  },
  additionalProperties: false,
} as const;

// POST /refresh
export const refreshResponse200 = {
  type: 'object',
  required: ['accessToken'],
  properties: { accessToken: { type: 'string' } },
  additionalProperties: false,
} as const;

// POST /logout
export const logoutBody = {
  type: 'object',
  properties: { all: { type: 'boolean' } },
  additionalProperties: false,
} as const;

// POST /verify-email
export const verifyEmailBody = {
  type: 'object',
  required: ['token'],
  properties: { token },
  additionalProperties: false,
} as const;

export const verifyEmailResponse200 = {
  type: 'object',
  properties: { message: { type: 'string' } },
  additionalProperties: false,
} as const;

// GET /me
const igConnectionSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    igUserId: { type: 'string' },
    igUsername: { type: 'string' },
    isActive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

export const meResponse200 = {
  type: 'object',
  required: ['id', 'email', 'mfaEnabled', 'currentTenant', 'memberships'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email,
    mfaEnabled: { type: 'boolean' },
    currentTenant: tenantSafe,
    currentRole: { type: 'string', enum: ['owner', 'admin', 'editor', 'viewer'] },
    memberships: { type: 'array', items: membershipInfo },
    igConnections: {
      type: 'array',
      items: igConnectionSafe,
    },
  },
  additionalProperties: false,
} as const;

export const errorResponse401 = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    code: { type: 'string', enum: ['expired', 'blacklisted', 'invalid'] },
  },
  additionalProperties: false,
} as const;
