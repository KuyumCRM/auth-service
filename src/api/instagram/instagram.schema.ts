// Instagram onboarding request/response schemas.

export const onboardConnectResponse200 = {
  type: 'object',
  required: ['redirectUrl', 'state'],
  properties: {
    redirectUrl: { type: 'string', format: 'uri' },
    state: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const onboardCallbackQuerystring = {
  type: 'object',
  required: ['code', 'state'],
  properties: {
    code: { type: 'string', minLength: 1 },
    state: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const onboardCallbackSuccess200 = {
  type: 'object',
  required: ['onboardingToken', 'igUsername', 'message'],
  properties: {
    onboardingToken: { type: 'string' },
    igUsername: { type: 'string' },
    message: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const onboardErrorResponse = {
  type: 'object',
  required: ['error', 'code'],
  properties: {
    error: { type: 'string' },
    code: {
      type: 'string',
      enum: [
        'instagram_personal_account',
        'instagram_already_has_workspace',
        'oauth_state_invalid',
        'oauth_exchange_failed',
      ],
    },
  },
  additionalProperties: false,
} as const;
