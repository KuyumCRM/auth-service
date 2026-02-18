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
export const API_V1_PASSWORD_PREFIX = '/api/v1/password';
export const API_V1_TENANT_PREFIX = '/api/v1/tenant';
export const API_V1_AUTH_INSTAGRAM_PREFIX = '/api/v1/auth/instagram';

// ——— Route paths ———
export const ROUTE_HEALTH = '/health';
export const ROUTE_ONBOARD_CONNECT = '/onboard-connect';
export const ROUTE_ONBOARD_CALLBACK = '/onboard-callback';

// ——— JWT / Auth ———
export const JWT_ALGORITHM_RS256 = 'RS256';
export const BEARER_PREFIX = 'Bearer ';
export const REFRESH_COOKIE_NAME = 'refreshToken';

// ——— Domain TTL / expiry ———
export const INVITE_EXPIRY_DAYS = 7;
export const PASSWORD_RESET_EXPIRY_HOURS = 1;

// ——— Password policy ———
export const BCRYPT_COST = 12;
export const PASSWORD_MIN_LENGTH = 12;

// ——— Auth API route paths (relative to API_V1_AUTH_PREFIX) ———
export const ROUTE_SIGNUP = '/signup';
export const ROUTE_CREATE_WORKSPACE = '/create-workspace';
export const ROUTE_ACCEPT_INVITE = '/accept-invite';
export const ROUTE_LOGIN = '/login';
export const ROUTE_REFRESH = '/refresh';
export const ROUTE_VERIFY_EMAIL = '/verify-email';
export const ROUTE_SWITCH_TENANT = '/switch-tenant';
export const ROUTE_LOGOUT = '/logout';
export const ROUTE_ME = '/me';

// ——— Password API route paths (relative to API_V1_PASSWORD_PREFIX) ———
export const ROUTE_FORGOT_PASSWORD = '/forgot-password';
export const ROUTE_RESET_PASSWORD = '/reset-password';

// ——— Tenant API route paths (relative to API_V1_TENANT_PREFIX) ———
export const ROUTE_TENANT_INVITE = '/invite';
export const ROUTE_TENANT_INVITATIONS = '/invitations';
export const ROUTE_TENANT_MEMBERS = '/members';

// ——— PostgreSQL error codes ———
/** Unique constraint violation (e.g. duplicate membership). */
export const PG_UNIQUE_VIOLATION = '23505';

// ——— Error codes (API responses) ———
export const ERROR_CODE_APP_ERROR = 'app_error';
export const ERROR_CODE_INVALID_CREDENTIALS = 'invalid_credentials';
export const ERROR_CODE_ACCOUNT_LOCKED = 'account_locked';
export const ERROR_CODE_OAUTH_EXCHANGE_FAILED = 'oauth_exchange_failed';
export const ERROR_CODE_INTERNAL = 'internal';
export const ERROR_CODE_INVALID = 'invalid';
export const ERROR_CODE_NOT_FOUND = 'not_found';
export const ERROR_CODE_UNAUTHORIZED = 'unauthorized';
export const ERROR_CODE_FORBIDDEN = 'forbidden';
export const ERROR_CODE_BLACKLISTED = 'blacklisted';
export const ERROR_CODE_EXPIRED = 'expired';

// ——— Error / success messages (API responses) ———
export const ERROR_MSG_INTERNAL_SERVER = 'Internal server error';
export const ERROR_MSG_INVALID_CREDENTIALS = 'Invalid credentials';
export const ERROR_MSG_REFRESH_TOKEN_REQUIRED = 'Refresh token required';
export const ERROR_MSG_USER_NOT_FOUND = 'User not found';
export const ERROR_MSG_AUTH_REQUIRED = 'Authentication required';
export const ERROR_MSG_INSUFFICIENT_PERMISSIONS = 'Insufficient permissions';
export const ERROR_MSG_MISSING_AUTH_HEADER = 'Missing or invalid Authorization header';
export const ERROR_MSG_INVALID_TOKEN = 'Invalid token';
export const ERROR_MSG_TOKEN_REVOKED = 'Token revoked';
export const ERROR_MSG_TOKEN_EXPIRED = 'Token expired';
export const MESSAGE_PASSWORD_UPDATED = 'Password updated';
export const MESSAGE_EMAIL_VERIFIED = 'Email verified';
