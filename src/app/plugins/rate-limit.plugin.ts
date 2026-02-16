// Redis-backed rate limiter.
import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { getRedisClient } from '../../infra/redis/redis.client.js';

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  const redis = getRedisClient();
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    skipOnError: true,
  });
}
