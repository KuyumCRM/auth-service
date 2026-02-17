import type { FastifyInstance } from 'fastify';
import { ROUTE_HEALTH } from '../../config/constants.js';
import { health } from './health.controller.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(ROUTE_HEALTH, { handler: health });
}
