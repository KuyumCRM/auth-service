// Application constants — extend as needed.

// ——— Time / TTL ———
/** Onboarding session TTL in seconds (15 minutes). */
export const ONBOARDING_TTL_SEC = 15 * 60;
/** OAuth state param TTL in seconds (10 minutes). */
export const OAUTH_STATE_TTL_SEC = 600;

// ——— Instagram OAuth ———
export const INSTAGRAM_AUTH_URL = 'https://api.instagram.com/oauth/authorize';
export const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
export const INSTAGRAM_GRAPH_ME = 'https://graph.instagram.com/me';
export const ONBOARD_SCOPES = 'user_profile,user_media';
export const ALLOWED_ACCOUNT_TYPES = new Set<string>(['BUSINESS', 'CREATOR']);

// ——— AES encryption ———
export const AES_ALGORITHM = 'aes-256-gcm';
export const AES_IV_LENGTH = 12;
export const AES_TAG_LENGTH = 16;
export const AES_KEY_LENGTH = 32;

// ——— Redis key prefixes ———
export const ONBOARDING_KEY_PREFIX = 'onboard:';
export const OAUTH_STATE_PREFIX = 'oauth_state:';
export const JTI_KEY_PREFIX = 'jti:';

// ——— API route prefixes ———
export const API_V1_AUTH_PREFIX = '/api/v1/auth';
export const API_V1_TENANT_PREFIX = '/api/v1/tenant';
export const API_V1_AUTH_INSTAGRAM_PREFIX = '/api/v1/auth/instagram';

// ——— Route paths ———
export const ROUTE_HEALTH = '/health';
export const ROUTE_ONBOARD_CONNECT = '/onboard-connect';
export const ROUTE_ONBOARD_CALLBACK = '/onboard-callback';

// ——— Error codes (API responses) ———
export const ERROR_CODE_OAUTH_EXCHANGE_FAILED = 'oauth_exchange_failed';
export const ERROR_CODE_INTERNAL = 'internal';
