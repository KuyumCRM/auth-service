// Auth HTTP handlers — thin: validate, call domain, format response, set cookies.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import {
  REFRESH_COOKIE_NAME,
  ERROR_CODE_APP_ERROR,
  ERROR_CODE_INVALID_CREDENTIALS,
  ERROR_CODE_ACCOUNT_LOCKED,
  ERROR_CODE_INTERNAL,
  ERROR_CODE_INVALID,
  ERROR_MSG_INVALID_CREDENTIALS,
  ERROR_MSG_INTERNAL_SERVER,
  ERROR_MSG_REFRESH_TOKEN_REQUIRED,
  MESSAGE_PASSWORD_UPDATED,
  MESSAGE_EMAIL_VERIFIED,
} from '../../config/constants.js';
import type { JwtPayload } from '../../domain/token/token.types.js';
import {
  AppError,
  InvalidCredentialsError,
  AccountLockedError,
  InvalidOnboardingTokenError,
  UserNotFoundError,
} from '../../domain/auth/auth.errors.js';

const REFRESH_MAX_AGE = env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60; // seconds

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  };
}

function toUserSafe(user: { id: string; email: string; mfaEnabled: boolean; emailVerified: boolean; isActive: boolean }) {
  return {
    id: user.id,
    email: user.email,
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
  };
}

function handleError(reply: FastifyReply, err: unknown): void {
  if (err instanceof UserNotFoundError) {
    reply.status(err.statusCode).send({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof AppError) {
    reply.status(err.statusCode).send({ error: err.message, code: ERROR_CODE_APP_ERROR });
    return;
  }
  if (err instanceof InvalidOnboardingTokenError) {
    reply.status(400).send({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof InvalidCredentialsError) {
    reply.status(401).send({ error: ERROR_MSG_INVALID_CREDENTIALS, code: ERROR_CODE_INVALID_CREDENTIALS });
    return;
  }
  if (err instanceof AccountLockedError) {
    reply.status(423).send({ error: err.message, code: ERROR_CODE_ACCOUNT_LOCKED });
    return;
  }
  reply.status(500).send({ error: ERROR_MSG_INTERNAL_SERVER, code: ERROR_CODE_INTERNAL });
}

// POST /signup (requires onboarding token from Instagram onboard-callback)
export async function signup(
  request: FastifyRequest<{
    Body: { onboardingToken: string; email: string; password: string; workspaceName?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    const result = await authService.signupWithOnboarding(request.body);
    reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, refreshCookieOptions());
    reply.status(201).send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: toUserSafe(result.user),
      tenant: result.tenant,
    });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /create-workspace (optional auth: with JWT = Case 2, without = Case 1 with email+password in body)
export async function createWorkspace(
  request: FastifyRequest<{
    Body: {
      onboardingToken: string;
      workspaceName?: string;
      email?: string;
      password?: string;
      mfaCode?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const jwtPayload = request.user as JwtPayload | undefined;
    const authService = request.server.authService!;
    const result = await authService.createWorkspace({
      onboardingToken: request.body.onboardingToken,
      workspaceName: request.body.workspaceName,
      userId: jwtPayload?.sub,
      email: request.body.email,
      password: request.body.password,
      mfaCode: request.body.mfaCode,
    });
    reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, refreshCookieOptions());
    reply.status(201).send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: toUserSafe(result.user),
      tenant: result.tenant,
    });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /accept-invite
export async function acceptInvite(
  request: FastifyRequest<{ Body: { inviteToken: string; password?: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    const result = await authService.acceptInvite(request.body);
    reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, refreshCookieOptions());
    reply.status(201).send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: toUserSafe(result.user),
      tenant: result.tenant,
    });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /login
export async function login(
  request: FastifyRequest<{ Body: { email: string; password: string; mfaCode?: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    const result = await authService.login(request.body);
    reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, refreshCookieOptions());
    reply.status(200).send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: toUserSafe(result.user),
      currentTenant: result.currentTenant,
      currentRole: result.currentRole,
      tenants: result.tenants,
    });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /switch-tenant
export async function switchTenant(
  request: FastifyRequest<{ Body: { tenantId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    const userId = (request.user as JwtPayload).sub;
    const tokens = await authService.switchTenant(userId, request.body.tenantId);
    reply.setCookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
    reply.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /refresh
export async function refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const rt = request.cookies[REFRESH_COOKIE_NAME];
  if (!rt) {
    reply.status(401).send({ error: ERROR_MSG_REFRESH_TOKEN_REQUIRED, code: ERROR_CODE_INVALID });
    return;
  }
  try {
    const tokenService = request.server.tokenService!;
    const tokens = await tokenService.rotateRefreshToken(rt);
    reply.setCookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
    reply.status(200).send({ accessToken: tokens.accessToken });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /logout
export async function logout(
  request: FastifyRequest<{ Body: { all?: boolean } }>,
  reply: FastifyReply
): Promise<void> {
  const rt = request.cookies[REFRESH_COOKIE_NAME];
  const jwtPayload = request.user as JwtPayload;
  const userId = jwtPayload.sub;
  const all = request.body?.all ?? false;

  // Blacklist current access token so it's rejected immediately (no wait for expiry)
  const jti = jwtPayload.jti;
  if (jti) {
    const nowSec = Math.floor(Date.now() / 1000);
    const ttlSec = Math.max(1, jwtPayload.exp - nowSec);
    await request.server.tokenBlacklist!.add(jti, ttlSec);
  }

  try {
    const authService = request.server.authService!;
    await authService.logout(userId, rt ?? '', all);
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    reply.status(204).send();
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /forgot-password
export async function forgotPassword(
  request: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    await authService.forgotPassword(request.body.email);
    reply.status(202).send();
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /reset-password
export async function resetPassword(
  request: FastifyRequest<{ Body: { token: string; newPassword: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    await authService.resetPassword(request.body.token, request.body.newPassword);
    reply.status(200).send({ message: MESSAGE_PASSWORD_UPDATED });
  } catch (err) {
    handleError(reply, err);
  }
}

// POST /verify-email
export async function verifyEmail(
  request: FastifyRequest<{ Body: { token: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    await authService.verifyEmail(request.body.token);
    reply.status(200).send({ message: MESSAGE_EMAIL_VERIFIED });
  } catch (err) {
    handleError(reply, err);
  }
}

// GET /me
export async function me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const jwtPayload = request.user as JwtPayload;
  const userId = jwtPayload.sub;
  const tenantId = jwtPayload.tenant_id;
  try {
    const authService = request.server.authService!;
    const result = await authService.getMe(userId, tenantId);
    reply.status(200).send(result);
  } catch (err) {
    handleError(reply, err);
  }
}
