// OpenAPI/Swagger docs.
import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';

export async function swaggerPlugin(app: FastifyInstance): Promise<void> {
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
}
