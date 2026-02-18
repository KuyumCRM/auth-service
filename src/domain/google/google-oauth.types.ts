// Google OAuth domain types.
import type {
  IGoogleOAuthStateStore,
  GoogleStatePayload,
} from '../../shared/interfaces/IGoogleOAuthStateStore.js';

export type { GoogleStatePayload };

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

export interface GoogleOAuthServiceDeps {
  googleStateStore: IGoogleOAuthStateStore;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Result of initiateAuth — redirect URL and state for the client. */
export interface GoogleInitiateResult {
  redirectUrl: string;
  state: string;
}

/** Google token endpoint response (authorization_code exchange). */
export interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/** Decoded Google id_token JWT payload (OpenID Connect claims). */
export interface GoogleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Result of handleCallback — profile and original state payload. */
export interface GoogleCallbackResult {
  profile: GoogleProfile;
  statePayload: GoogleStatePayload;
}
