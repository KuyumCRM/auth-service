// Revoked JWT jti blacklist — Redis with TTL.
import type { ITokenBlacklist } from '../../shared/interfaces/ITokenBlacklist.js';
import { env } from '../../config/env.js';
import { getRedisClient } from './redis.client.js';

const KEY_PREFIX = 'jti:';

export function createTokenBlacklist(): ITokenBlacklist {
  const client = getRedisClient();

  return {
    async add(jti: string, ttlSec: number): Promise<void> {
      const key = KEY_PREFIX + jti;
      await client.set(key, '1', 'EX', ttlSec);
    },

    async has(jti: string): Promise<boolean> {
      const key = KEY_PREFIX + jti;
      const v = await client.get(key);
      return v !== null;
    },
  };
}

// Default instance using env JWT TTL for add() when caller does not specify.
export const defaultTtlSec = env.JWT_ACCESS_TTL_SEC;
