import 'fastify';
import type { JwtPayload } from '../../domain/token/token.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    tenantId?: string;
  }
}
