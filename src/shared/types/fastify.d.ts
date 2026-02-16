import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { sub: string; tenant_id?: string };
    tenantId?: string;
  }
}

export {};
