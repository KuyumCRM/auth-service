// OpenAPI/Swagger docs.
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Auth Service',
        version: '0.1.0',
        description: 'Authentication and user management API',
      },
      servers: [{ url: '/', description: 'Current' }],
    },
  });
});
