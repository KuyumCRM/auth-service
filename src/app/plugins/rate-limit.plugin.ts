// Redis-backed rate limiter.
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { getRedisClient } from '../../infra/redis/redis.client.js';

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  const redis = getRedisClient();
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    skipOnError: true,
  });
});
