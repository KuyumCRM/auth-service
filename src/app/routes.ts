import type { FastifyInstance } from 'fastify';
import {
  API_V1_AUTH_PREFIX,
  API_V1_AUTH_INSTAGRAM_PREFIX,
  API_V1_PASSWORD_PREFIX,
  API_V1_TENANT_PREFIX,
} from '../config/constants.js';
import { authRoutes } from '../api/auth/auth.routes.js';
import { passwordRoutes } from '../api/password/password.routes.js';
import { instagramRoutes } from '../api/instagram/instagram.routes.js';
import { tenantRoutes } from '../api/tenant/tenant.routes.js';
import { healthRoutes } from '../api/health/health.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: API_V1_AUTH_PREFIX });
  await app.register(passwordRoutes, { prefix: API_V1_PASSWORD_PREFIX });
  await app.register(instagramRoutes, { prefix: API_V1_AUTH_INSTAGRAM_PREFIX });
  await app.register(tenantRoutes, { prefix: API_V1_TENANT_PREFIX });
}
