// Fastify JSON schema for password reset request bodies and responses.

const email = { type: 'string', format: 'email' } as const;
const password = { type: 'string', minLength: 12 };
const token = { type: 'string', minLength: 1 };

// POST /forgot-password
export const forgotPasswordBody = {
  type: 'object',
  required: ['email'],
  properties: { email },
  additionalProperties: false,
} as const;

// POST /reset-password
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
