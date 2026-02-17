// Instagram-first onboarding: session payload and API contract.

/** Verified Instagram data stored in onboarding session (Redis) after callback. */
export interface OnboardingSessionPayload {
  igUserId: string;
  igUsername: string;
  accountType: string; // BUSINESS | CREATOR
  scopes: string[];
  accessTokenEnc: string; // AES-256-GCM encrypted long-lived token
  tokenIv: string;
  tokenExpiresAt: string; // ISO
}

/** Response shape for GET /auth/instagram/onboard-callback (success). */
export interface OnboardingCallbackSuccess {
  onboardingToken: string;
  igUsername: string;
  message: string;
}

/** Stable error codes for onboarding API (for frontend handling). */
export const ONBOARDING_ERROR_CODES = {
  INSTAGRAM_PERSONAL_ACCOUNT: 'instagram_personal_account',
  INSTAGRAM_ALREADY_HAS_WORKSPACE: 'instagram_already_has_workspace',
  INVALID_ONBOARDING_TOKEN: 'invalid_onboarding_token',
  OAUTH_STATE_INVALID: 'oauth_state_invalid',
  OAUTH_EXCHANGE_FAILED: 'oauth_exchange_failed',
} as const;

export type OnboardingErrorCode =
  (typeof ONBOARDING_ERROR_CODES)[keyof typeof ONBOARDING_ERROR_CODES];
