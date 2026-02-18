// Fastify JSON schema for Google OAuth endpoints.

const userSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    mfaEnabled: { type: 'boolean' },
    emailVerified: { type: 'boolean' },
    isActive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

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

// POST /initiate
export const initiateBody = {
  type: 'object',
  required: ['mode'],
  properties: {
    mode: { type: 'string', enum: ['login', 'signup'] },
    onboardingToken: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const initiateResponse200 = {
  type: 'object',
  required: ['redirectUrl', 'state'],
  properties: {
    redirectUrl: { type: 'string', format: 'uri' },
    state: { type: 'string' },
  },
  additionalProperties: false,
} as const;

// POST /callback
export const callbackBody = {
  type: 'object',
  required: ['code', 'state'],
  properties: {
    code: { type: 'string', minLength: 1 },
    state: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

// Callback 200 — login result
export const callbackLoginResponse200 = {
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

// Callback 201 — signup result
export const callbackSignupResponse201 = {
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

export const googleErrorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    code: {
      type: 'string',
      enum: ['google_oauth_failed', 'invalid_onboarding_token', 'app_error'],
    },
  },
  additionalProperties: false,
} as const;
