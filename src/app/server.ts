import 'reflect-metadata';
import Fastify from 'fastify';
import { env } from '../config/env.js';
import { initializeDataSource, getDataSource } from '../infra/db/data-source.js';
import { getRedisClient, closeRedis } from '../infra/redis/redis.client.js';
import { closeKafka } from '../infra/kafka/kafka.client.js';
import { createTokenBlacklist } from '../infra/redis/token-blacklist.cache.js';
import { createStubEventPublisher } from '../infra/kafka/stub-event.publisher.js';
import { createStubTenantRepository } from '../infra/tenant/tenant.repository.js';
import { createStubEmailSender } from '../infra/email/stub-email.sender.js';
import { createUserRepository } from '../infra/db/repositories/user.repository.js';
import { createUserByEmailLookup } from '../infra/db/repositories/user-lookup.repository.js';
import { createGlobalUserRepository } from '../infra/db/repositories/global-user.repository.js';
import { AuditRepository } from '../infra/db/repositories/audit.repository.js';
import { TokenRepository } from '../infra/db/repositories/token.repository.js';
import { InstagramTokenRepository } from '../infra/db/repositories/instagram-token.repository.js';
import { OneTimeTokenRepository } from '../infra/db/repositories/one-time-token.repository.js';
import { PasswordService } from '../domain/password/password.service.js';
import { TotpService } from '../domain/mfa/totp.service.js';
import { TokenService } from '../domain/token/token.service.js';
import { AuthService } from '../domain/auth/auth.service.js';
import { createAuthenticateGuard } from '../shared/guards/authenticate.guard.js';
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

const app = Fastify({
  logger: { level: env.LOG_LEVEL },
});

async function main(): Promise<void> {
  await initializeDataSource();
  await startupHealthCheck();

  await app.register(corsPlugin);
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);

  const privateKeyPem = decodePemFromB64(env.JWT_PRIVATE_KEY_B64);
  const publicKeyPem = decodePemFromB64(env.JWT_PUBLIC_KEY_B64);

  const tokenBlacklist = createTokenBlacklist();
  const authenticateGuard = createAuthenticateGuard({
    tokenBlacklist,
    publicKeyPem,
  });

  const auditRepo = new AuditRepository();
  const tokenRepo = new TokenRepository();
  const tenantRepo = createStubTenantRepository();
  const eventPublisher = createStubEventPublisher();
  const passwordService = new PasswordService();
  const totpService = new TotpService();
  const oneTimeTokenRepo = new OneTimeTokenRepository();
  const emailSender = createStubEmailSender();
  const userByEmailLookup = createUserByEmailLookup();
  const globalUserRepo = createGlobalUserRepository();
  const instagramRepo = new InstagramTokenRepository();

  const getUserRepo = (tenantId: string) => createUserRepository(tenantId);

  const tokenService = new TokenService(
    tokenRepo,
    tenantRepo,
    eventPublisher,
    {
      privateKeyPem,
      publicKeyPem,
      accessTtlSec: env.JWT_ACCESS_TTL_SEC,
      refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
    }
  );

  const resetPasswordBaseUrl = `${env.DASHBOARD_URL}/reset-password`;
  const authService = new AuthService(
    getUserRepo,
    auditRepo,
    eventPublisher,
    passwordService,
    tokenService,
    totpService,
    oneTimeTokenRepo,
    emailSender,
    userByEmailLookup,
    globalUserRepo,
    resetPasswordBaseUrl
  );

  app.decorate('authService', authService);
  app.decorate('tokenService', tokenService);
  app.decorate('globalUserRepo', globalUserRepo);
  app.decorate('instagramRepo', instagramRepo);
  app.decorate('authenticateGuard', authenticateGuard);

  await app.register(registerRoutes);

  const port = env.PORT;
  const host = env.HOST;

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Shutting down');
    try {
      await app.close();
      await getDataSource().destroy();
      await closeRedis();
      await closeKafka();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
