// Revoked JWT jti blacklist — Redis with TTL.
import type { ITokenBlacklist } from '../../shared/interfaces/ITokenBlacklist.js';
import { env } from '../../config/env.js';
import { JTI_KEY_PREFIX } from '../../config/constants.js';
import { getRedisClient } from './redis.client.js';

/** Default TTL for blacklisted jti — matches access token expiry. */
export const defaultTtlSec = env.JWT_ACCESS_TTL_SEC;

export function createTokenBlacklist(): ITokenBlacklist {
  const client = getRedisClient();

  return {
    async add(jti: string, ttlSec: number = defaultTtlSec): Promise<void> {
      const key = JTI_KEY_PREFIX + jti;
      await client.set(key, '1', 'EX', ttlSec);
    },

    async has(jti: string): Promise<boolean> {
      const key = JTI_KEY_PREFIX + jti;
      const v = await client.get(key);
      return v !== null;
    },
  };
}
