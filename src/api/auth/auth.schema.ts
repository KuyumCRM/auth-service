// Fastify JSON schema for auth request bodies and responses. Passwords never in responses.

const email = { type: 'string', format: 'email' } as const;
const password = { type: 'string', minLength: 12 };
const tenantId = { type: 'string', format: 'uuid' };
const token = { type: 'string', minLength: 1 };
const mfaCode = { type: 'string', minLength: 6, maxLength: 6 };

export const registerBody = {
  type: 'object',
  required: ['email', 'password', 'tenantId'],
  properties: { email, password, tenantId },
  additionalProperties: false,
} as const;

export const registerResponse201 = {
  type: 'object',
  required: ['userId', 'accessToken', 'refreshToken'],
  properties: {
    userId: { type: 'string', format: 'uuid' },
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
  },
  additionalProperties: false,
} as const;

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

const userSafe = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email,
    tenantId,
    mfaEnabled: { type: 'boolean' },
    emailVerified: { type: 'boolean' },
    isActive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

export const loginResponse200 = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: userSafe,
  },
  additionalProperties: false,
} as const;

export const refreshResponse200 = {
  type: 'object',
  required: ['accessToken'],
  properties: { accessToken: { type: 'string' } },
  additionalProperties: false,
} as const;

export const logoutBody = {
  type: 'object',
  properties: { all: { type: 'boolean' } },
  additionalProperties: false,
} as const;

export const forgotPasswordBody = {
  type: 'object',
  required: ['email'],
  properties: { email },
  additionalProperties: false,
} as const;

export const resetPasswordBody = {
  type: 'object',
  required: ['token', 'newPassword'],
  properties: {
    token,
    newPassword: password,
  },
  additionalProperties: false,
} as const;

export const resetPasswordResponse200 = {
  type: 'object',
  properties: { message: { type: 'string' } },
  additionalProperties: false,
} as const;

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
  required: ['id', 'email', 'tenantId', 'mfaEnabled', 'igConnections'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email,
    tenantId,
    mfaEnabled: { type: 'boolean' },
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
