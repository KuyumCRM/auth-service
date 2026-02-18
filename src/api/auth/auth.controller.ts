// Auth HTTP handlers — thin: validate, call domain, format response, set cookies.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import {
  REFRESH_COOKIE_NAME,
  ERROR_CODE_INVALID,
  ERROR_MSG_REFRESH_TOKEN_REQUIRED,
  MESSAGE_EMAIL_VERIFIED,
} from '../../config/constants.js';
import type { JwtPayload } from '../../domain/token/token.types.js';
import { toUserSafe, createRefreshCookieOptions } from '../../shared/utils/index.js';

const REFRESH_COOKIE_OPTIONS = createRefreshCookieOptions(
  env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60,
  env.NODE_ENV === 'production'
);

// POST /signup (requires onboarding token from Instagram onboard-callback)
export async function signup(
  request: FastifyRequest<{
    Body: { onboardingToken: string; email: string; password: string; workspaceName?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const authService = request.server.authService!;
  const result = await authService.signupWithOnboarding(request.body);
  reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  reply.status(201).send({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: toUserSafe(result.user),
    tenant: result.tenant,
  });
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
  reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  reply.status(201).send({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: toUserSafe(result.user),
    tenant: result.tenant,
  });
}

// POST /accept-invite
export async function acceptInvite(
  request: FastifyRequest<{ Body: { inviteToken: string; password?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const authService = request.server.authService!;
  const result = await authService.acceptInvite(request.body);
  reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  reply.status(201).send({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: toUserSafe(result.user),
    tenant: result.tenant,
  });
}

// POST /login
export async function login(
  request: FastifyRequest<{ Body: { email: string; password: string; mfaCode?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const authService = request.server.authService!;
  const result = await authService.login(request.body);
  reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  reply.status(200).send({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: toUserSafe(result.user),
    currentTenant: result.currentTenant,
    currentRole: result.currentRole,
    tenants: result.tenants,
  });
}

// POST /switch-tenant
export async function switchTenant(
  request: FastifyRequest<{ Body: { tenantId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const authService = request.server.authService!;
  const userId = (request.user as JwtPayload).sub;
  const tokens = await authService.switchTenant(userId, request.body.tenantId);
  reply.setCookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  reply.status(200).send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// POST /refresh
export async function refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const rt = request.cookies[REFRESH_COOKIE_NAME];
  if (!rt) {
    reply.status(401).send({ error: ERROR_MSG_REFRESH_TOKEN_REQUIRED, code: ERROR_CODE_INVALID });
    return;
  }
  const tokenService = request.server.tokenService!;
  const tokens = await tokenService.rotateRefreshToken(rt);
  reply.setCookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  reply.status(200).send({ accessToken: tokens.accessToken });
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

  const authService = request.server.authService!;
  await authService.logout(userId, rt ?? '', all);
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  reply.status(204).send();
}

// POST /verify-email
export async function verifyEmail(
  request: FastifyRequest<{ Body: { token: string } }>,
  reply: FastifyReply
): Promise<void> {
  const authService = request.server.authService!;
  await authService.verifyEmail(request.body.token);
  reply.status(200).send({ message: MESSAGE_EMAIL_VERIFIED });
}

// GET /me
export async function me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const jwtPayload = request.user as JwtPayload;
  const userId = jwtPayload.sub;
  const tenantId = jwtPayload.tenant_id;
  const authService = request.server.authService!;
  const result = await authService.getMe(userId, tenantId);
  reply.status(200).send(result);
}
