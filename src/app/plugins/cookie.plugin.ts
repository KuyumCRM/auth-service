import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';

export const cookiePlugin = fp(async (app: FastifyInstance) => {
  await app.register(cookie);
});
