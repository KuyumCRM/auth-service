import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export const corsPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
});
