import 'reflect-metadata';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { env } from '../config/env.js';
import { ONBOARDING_TTL_SEC, OAUTH_STATE_TTL_SEC } from '../config/constants.js';
import { initializeDataSource, getDataSource } from '../infra/db/data-source.js';
import { getRedisClient } from '../infra/redis/redis.client.js';
import { createTokenBlacklist } from '../infra/redis/token-blacklist.cache.js';
import { createOnboardingSessionStore, createOAuthStateStore } from '../infra/redis/session.cache.js';
import { createEncryption } from '../infra/encryption/aes.service.js';
import { InstagramOAuthService } from '../domain/instagram/instagram-oauth.service.js';
import { createStubEventPublisher } from '../infra/kafka/stub-event.publisher.js';
import { createStubEmailSender } from '../infra/email/stub-email.sender.js';
import { createUserRepository } from '../infra/db/repositories/user.repository.js';
import { createTenantRepository } from '../infra/db/repositories/tenant.repository.js';
import { createMembershipRepository } from '../infra/db/repositories/membership.repository.js';
import { createInvitationRepository } from '../infra/db/repositories/invitation.repository.js';
import { AuditRepository } from '../infra/db/repositories/audit.repository.js';
import { TokenRepository } from '../infra/db/repositories/token.repository.js';
import { InstagramTokenRepository } from '../infra/db/repositories/instagram-token.repository.js';
import { OneTimeTokenRepository } from '../infra/db/repositories/one-time-token.repository.js';
import { OneTimeTokenService } from '../domain/one-time-token/one-time-token.service.js';
import { PasswordService } from '../domain/password/password.service.js';
import { PasswordResetService } from '../domain/password/password-reset.service.js';
import { TotpService } from '../domain/mfa/totp.service.js';
import { TokenService } from '../domain/token/token.service.js';
import { AuthService } from '../domain/auth/auth.service.js';
import { TenantService } from '../domain/tenant/tenant.service.js';
import { InvitationService } from '../domain/invitation/invitation.service.js';
import { createAuthenticateGuard } from '../shared/guards/authenticate.guard.js';
import { createErrorHandler } from '../shared/errors/error-handler.js';
import { corsPlugin } from './plugins/cors.plugin.js';
import { cookiePlugin } from './plugins/cookie.plugin.js';
import { jwtPlugin } from './plugins/jwt.plugin.js';
import { rateLimitPlugin } from './plugins/rate-limit.plugin.js';
import { swaggerPlugin } from './plugins/swagger.plugin.js';
import { registerRoutes } from './routes.js';

function decodePemFromB64(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function startupHealthCheck(): Promise<void> {
  const ds = getDataSource();
  await ds.manager.query('SELECT 1');
  const redis = getRedisClient();
  await redis.ping();
}

/** Build and return the Fastify app with all plugins and routes (no listen). Used by E2E and server. */
export async function createApp(): Promise<FastifyInstance> {
  await initializeDataSource();
  await startupHealthCheck();

  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  await app.register(corsPlugin);
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);

  app.setErrorHandler(createErrorHandler());

  const privateKeyPem = decodePemFromB64(env.JWT_PRIVATE_KEY_B64);
  const publicKeyPem = decodePemFromB64(env.JWT_PUBLIC_KEY_B64);

  const tokenBlacklist = createTokenBlacklist();
  const authenticateGuard = createAuthenticateGuard({
    tokenBlacklist,
    publicKeyPem,
  });
  const optionalAuthenticateGuard = createAuthenticateGuard({
    tokenBlacklist,
    publicKeyPem,
    optional: true,
  });

  const auditRepo = new AuditRepository();
  const tokenRepo = new TokenRepository();
  const userRepo = createUserRepository();
  const tenantRepo = createTenantRepository();
  const membershipRepo = createMembershipRepository();
  const invitationRepo = createInvitationRepository();
  const instagramRepo = new InstagramTokenRepository();
  const oneTimeTokenRepo = new OneTimeTokenRepository();
  const oneTimeTokenService = new OneTimeTokenService({ oneTimeTokenRepo });

  const eventPublisher = createStubEventPublisher();
  const emailSender = createStubEmailSender();
  const passwordService = new PasswordService();
  const totpService = new TotpService();

  const tokenService = new TokenService({
    tokenRepo,
    tenantRepo,
    userRepo,
    membershipRepo,
    eventPublisher,
    config: {
      privateKeyPem,
      publicKeyPem,
      accessTtlSec: env.JWT_ACCESS_TTL_SEC,
      refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
    },
  });

  const resetPasswordBaseUrl = `${env.DASHBOARD_URL}/reset-password`;
  const onboardingSessionStore = createOnboardingSessionStore();
  const authService = new AuthService({
    userRepo,
    tenantRepo,
    membershipRepo,
    invitationRepo,
    auditRepo,
    eventPublisher,
    passwordService,
    tokenService,
    totpService,
    oneTimeTokenService,
    onboardingSessionStore,
    instagramRepo,
  });

  const passwordResetService = new PasswordResetService({
    userRepo,
    oneTimeTokenService,
    emailSender,
    passwordService,
    tokenService,
    auditRepo,
    resetPasswordBaseUrl,
  });

  const tenantService = new TenantService({
    tenantRepo,
    membershipRepo,
    eventPublisher,
    auditRepo,
  });

  const inviteBaseUrl = `${env.DASHBOARD_URL}/accept-invite`;
  const invitationService = new InvitationService({
    invitationRepo,
    membershipRepo,
    userRepo,
    emailSender,
    auditRepo,
    inviteBaseUrl,
  });

  const oauthStateStore = createOAuthStateStore(OAUTH_STATE_TTL_SEC);
  const encryption = createEncryption();
  const instagramOAuthService = new InstagramOAuthService({
    onboardingSessionStore,
    oauthStateStore,
    instagramRepo,
    encryption,
    redirectUri: env.IG_REDIRECT_URI,
    appId: env.IG_APP_ID,
    appSecret: env.IG_APP_SECRET,
    onboardingTtlSec: ONBOARDING_TTL_SEC,
  });

  app.decorate('authService', authService);
  app.decorate('passwordResetService', passwordResetService);
  app.decorate('tokenService', tokenService);
  app.decorate('tenantService', tenantService);
  app.decorate('invitationService', invitationService);
  app.decorate('userRepo', userRepo);
  app.decorate('tenantRepo', tenantRepo);
  app.decorate('membershipRepo', membershipRepo);
  app.decorate('instagramRepo', instagramRepo);
  app.decorate('instagramOAuthService', instagramOAuthService);
  app.decorate('authenticateGuard', authenticateGuard);
  app.decorate('optionalAuthenticateGuard', optionalAuthenticateGuard);
  app.decorate('tokenBlacklist', tokenBlacklist);

  await app.register(registerRoutes);

  return app;
}
