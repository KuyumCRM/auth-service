// Google OAuth HTTP handlers: initiate, callback.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { REFRESH_COOKIE_NAME } from '../../config/constants.js';
import { toUserSafe, createRefreshCookieOptions } from '../../shared/utils/index.js';
import { AppError } from '../../shared/errors/domain-errors.js';

const REFRESH_COOKIE_OPTIONS = createRefreshCookieOptions(
  env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60,
  env.NODE_ENV === 'production'
);

/** POST /initiate — returns redirectUrl and state for frontend to redirect user to Google. */
export async function initiate(
  request: FastifyRequest<{
    Body: { mode: 'login' | 'signup'; onboardingToken?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const googleOAuthService = request.server.googleOAuthService!;
  const { mode, onboardingToken } = request.body;

  if (mode === 'signup' && !onboardingToken) {
    throw new AppError('onboardingToken is required for signup', 400);
  }

  const payload = {
    mode,
    ...(onboardingToken && { onboardingToken }),
  };
  const result = await googleOAuthService.initiateAuth(payload);
  reply.status(200).send(result);
}

/** POST /callback — exchange code for profile, then login or signup. */
export async function callback(
  request: FastifyRequest<{
    Body: { code: string; state: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const googleOAuthService = request.server.googleOAuthService!;
  const authService = request.server.authService!;
  const { code, state } = request.body;

  const { profile, statePayload } = await googleOAuthService.handleCallback(
    code,
    state
  );

  if (statePayload.mode === 'login') {
    const result = await authService.googleLogin(profile);
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      result.tokens.refreshToken,
      REFRESH_COOKIE_OPTIONS
    );
    reply.status(200).send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: toUserSafe(result.user),
      currentTenant: result.currentTenant,
      currentRole: result.currentRole,
      tenants: result.tenants,
    });
    return;
  }

  // signup
  const onboardingToken = statePayload.onboardingToken;
  if (!onboardingToken) {
    throw new AppError('Missing onboarding token for signup', 400);
  }
  const result = await authService.googleSignup(profile, onboardingToken);
  reply.setCookie(
    REFRESH_COOKIE_NAME,
    result.tokens.refreshToken,
    REFRESH_COOKIE_OPTIONS
  );
  reply.status(201).send({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: toUserSafe(result.user),
    tenant: result.tenant,
  });
}
