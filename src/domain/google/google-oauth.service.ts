// Google OAuth: initiate auth, handle callback, exchange code for tokens, decode id_token.
import * as crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type {
  GoogleStatePayload,
  GoogleProfile,
  GoogleInitiateResult,
  GoogleTokenResponse,
  GoogleIdTokenPayload,
  GoogleCallbackResult,
  GoogleOAuthServiceDeps,
} from './google-oauth.types.js';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_JWKS_URL,
  GOOGLE_SCOPES,
} from '../../config/constants.js';
import { GoogleOAuthError } from '../../shared/errors/domain-errors.js';

export class GoogleOAuthService {
  constructor(private readonly deps: GoogleOAuthServiceDeps) {}

  /** Build redirect URL to Google and store state + payload for CSRF and flow context. */
  async initiateAuth(payload: GoogleStatePayload): Promise<GoogleInitiateResult> {
    const state = crypto.randomBytes(16).toString('hex');
    await this.deps.googleStateStore.set(state, payload);

    const params = new URLSearchParams({
      client_id: this.deps.clientId,
      redirect_uri: this.deps.redirectUri,
      scope: GOOGLE_SCOPES,
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const redirectUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    return { redirectUrl, state };
  }

  /** Validate state, exchange code for tokens, verify id_token and return profile + state payload. */
  async handleCallback(code: string, state: string): Promise<GoogleCallbackResult> {
    const statePayload = await this.deps.googleStateStore.validateAndConsume(state);
    if (!statePayload) {
      throw new GoogleOAuthError('Invalid or expired OAuth state');
    }

    const tokenRes = await this.exchangeCode(code);
    if (!tokenRes.id_token) {
      throw new GoogleOAuthError('Missing id_token in token response');
    }

    const profile = await this.verifyIdToken(tokenRes.id_token);
    return { profile, statePayload };
  }

  private async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.deps.clientId,
      client_secret: this.deps.clientSecret,
      redirect_uri: this.deps.redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new GoogleOAuthError(`Token exchange failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as GoogleTokenResponse & { error?: string };
    if (data.error || !data.access_token) {
      throw new GoogleOAuthError(data.error ?? 'Invalid token response');
    }
    return data;
  }

  private async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: 'https://accounts.google.com',
        audience: this.deps.clientId,
      });

      const p = payload as unknown as GoogleIdTokenPayload;
      if (!p.sub) {
        throw new GoogleOAuthError('Invalid id_token: missing sub');
      }

      return {
        googleId: p.sub,
        email: p.email ?? '',
        name: p.name ?? '',
        picture: p.picture ?? null,
        emailVerified: p.email_verified === true,
      };
    } catch (err) {
      if (err instanceof GoogleOAuthError) throw err;
      const message = err instanceof Error ? err.message : 'id_token verification failed';
      throw new GoogleOAuthError(message);
    }
  }
}
