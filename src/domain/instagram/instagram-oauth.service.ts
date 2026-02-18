// Instagram OAuth for onboarding: initiate, callback, account-type gate, duplicate check.
import * as crypto from 'crypto';
import type { OnboardingSessionPayload, OnboardingCallbackSuccess } from './onboarding.types.js';
import {
  INSTAGRAM_AUTH_URL,
  INSTAGRAM_TOKEN_URL,
  INSTAGRAM_GRAPH_ME,
  ONBOARD_SCOPES,
  ALLOWED_ACCOUNT_TYPES,
} from '../../config/constants.js';
import {
  InstagramOAuthError,
  InstagramPersonalAccountError,
  InstagramAlreadyHasWorkspaceError,
} from '../../shared/errors/domain-errors.js';
import type { InstagramOAuthServiceDeps } from './instagram.types.js';

interface TokenExchangeResponse {
  access_token: string;
  user_id: string;
}

interface IgMeResponse {
  id: string;
  username: string;
  account_type?: string;
}

export class InstagramOAuthService {
  constructor(private readonly deps: InstagramOAuthServiceDeps) {}

  /** Build redirect URL to Instagram and store state for CSRF. */
  async initiateOnboardConnect(): Promise<{ redirectUrl: string; state: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    await this.deps.oauthStateStore.set(state);

    const params = new URLSearchParams({
      client_id: this.deps.appId,
      redirect_uri: this.deps.redirectUri,
      scope: ONBOARD_SCOPES,
      response_type: 'code',
      state,
    });

    const redirectUrl = `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
    return { redirectUrl, state };
  }

  /** Exchange code, fetch profile, gate by account type and duplicate tenant, return onboarding token. */
  async handleOnboardCallback(code: string, state: string): Promise<OnboardingCallbackSuccess> {
    const validState = await this.deps.oauthStateStore.validateAndConsume(state);
    if (!validState) {
      throw new InstagramOAuthError('Invalid or expired OAuth state');
    }

    const tokenRes = await this.exchangeCode(code);
    const { access_token: accessToken, user_id: igUserId } = tokenRes;

    const profile = await this.fetchProfile(accessToken);
    const accountType = (profile.account_type ?? 'PERSONAL').toUpperCase();

    if (!ALLOWED_ACCOUNT_TYPES.has(accountType)) {
      throw new InstagramPersonalAccountError();
    }

    const existing = await this.deps.instagramRepo.findByIgUserId(igUserId);
    if (existing) {
      throw new InstagramAlreadyHasWorkspaceError();
    }

    const { ciphertext: accessTokenEnc, iv: tokenIv } = this.deps.encryption.encrypt(accessToken);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days typical for long-lived

    const payload: OnboardingSessionPayload = {
      igUserId,
      igUsername: profile.username,
      accountType,
      scopes: ONBOARD_SCOPES.split(',').map((s) => s.trim()),
      accessTokenEnc,
      tokenIv,
      tokenExpiresAt: expiresAt.toISOString(),
    };

    const onboardingToken = await this.deps.onboardingSessionStore.set(
      payload,
      this.deps.onboardingTtlSec
    );

    return {
      onboardingToken,
      igUsername: profile.username,
      message: `Welcome ${profile.username}, complete signup to create your workspace.`,
    };
  }

  private async exchangeCode(code: string): Promise<TokenExchangeResponse> {
    const body = new URLSearchParams({
      client_id: this.deps.appId,
      client_secret: this.deps.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.deps.redirectUri,
      code,
    });

    const res = await fetch(INSTAGRAM_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InstagramOAuthError(`Token exchange failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as TokenExchangeResponse & { user?: { id: string; username: string } };
    if (!data.access_token || !data.user_id) {
      throw new InstagramOAuthError('Invalid token response');
    }
    return { access_token: data.access_token, user_id: data.user_id };
  }

  private async fetchProfile(accessToken: string): Promise<IgMeResponse> {
    const url = `${INSTAGRAM_GRAPH_ME}?fields=id,username,account_type&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      throw new InstagramOAuthError(`Profile fetch failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as IgMeResponse & { error?: unknown };
    if (data.error || !data.id || !data.username) {
      throw new InstagramOAuthError('Invalid profile response');
    }
    return {
      id: data.id,
      username: data.username,
      account_type: data.account_type,
    };
  }
}
