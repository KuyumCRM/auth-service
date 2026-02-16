// Auth HTTP handlers — thin: validate, call domain, format response, set cookies.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import type { JwtPayload } from '../../domain/token/token.types.js';
import { AppError, InvalidCredentialsError, AccountLockedError } from '../../domain/auth/auth.errors.js';

const REFRESH_COOKIE = 'refreshToken';
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

function toUserSafe(user: { id: string; email: string; tenantId: string; mfaEnabled: boolean; emailVerified: boolean; isActive: boolean }) {
  return {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
  };
}

function toMeIgConnection(conn: { id: string; igUserId: string; igUsername: string; isActive: boolean }) {
  return {
    id: conn.id,
    igUserId: conn.igUserId,
    igUsername: conn.igUsername,
    isActive: conn.isActive,
  };
}

function handleError(reply: FastifyReply, err: unknown): void {
  if (err instanceof AppError) {
    reply.status(err.statusCode).send({ error: err.message, code: 'app_error' });
    return;
  }
  if (err instanceof InvalidCredentialsError) {
    reply.status(401).send({ error: 'Invalid credentials', code: 'invalid_credentials' });
    return;
  }
  if (err instanceof AccountLockedError) {
    reply.status(423).send({ error: err.message, code: 'account_locked' });
    return;
  }
  reply.status(500).send({ error: 'Internal server error', code: 'internal' });
}

export async function register(
  request: FastifyRequest<{ Body: { email: string; password: string; tenantId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    const { user, tokens } = await authService.register(request.body);
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
    reply.status(201).send({
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    handleError(reply, err);
  }
}

export async function login(
  request: FastifyRequest<{ Body: { email: string; password: string; mfaCode?: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    const { user, tokens } = await authService.login(request.body);
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
    reply.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toUserSafe(user),
    });
  } catch (err) {
    handleError(reply, err);
  }
}

export async function refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const rt = request.cookies[REFRESH_COOKIE];
  if (!rt) {
    reply.status(401).send({ error: 'Refresh token required', code: 'invalid' });
    return;
  }
  try {
    const tokenService = request.server.tokenService!;
    const tokens = await tokenService.rotateRefreshToken(rt);
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
    reply.status(200).send({ accessToken: tokens.accessToken });
  } catch (err) {
    handleError(reply, err);
  }
}

export async function logout(
  request: FastifyRequest<{ Body: { all?: boolean } }>,
  reply: FastifyReply
): Promise<void> {
  const rt = request.cookies[REFRESH_COOKIE];
  const userId = (request.user as JwtPayload).sub;
  const all = request.body?.all ?? false;
  try {
    const authService = request.server.authService!;
    await authService.logout(userId, rt ?? '', all);
    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
    reply.status(204).send();
  } catch (err) {
    handleError(reply, err);
  }
}

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

export async function resetPassword(
  request: FastifyRequest<{ Body: { token: string; newPassword: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    await authService.resetPassword(request.body.token, request.body.newPassword);
    reply.status(200).send({ message: 'Password updated' });
  } catch (err) {
    handleError(reply, err);
  }
}

export async function verifyEmail(
  request: FastifyRequest<{ Body: { token: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const authService = request.server.authService!;
    await authService.verifyEmail(request.body.token);
    reply.status(200).send({ message: 'Email verified' });
  } catch (err) {
    handleError(reply, err);
  }
}

export async function me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = (request.user as JwtPayload).sub;
  try {
    const globalUserRepo = request.server.globalUserRepo!;
    const instagramRepo = request.server.instagramRepo!;
    const user = await globalUserRepo.findById(userId);
    if (!user) {
      reply.status(404).send({ error: 'User not found', code: 'not_found' });
      return;
    }
    const connections = await instagramRepo.findByUserId(userId);
    reply.status(200).send({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      mfaEnabled: user.mfaEnabled,
      igConnections: connections.map(toMeIgConnection),
    });
  } catch (err) {
    handleError(reply, err);
  }
}
