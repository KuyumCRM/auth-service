// OAuth state and onboarding session store — Redis with TTL and one-time consumption.
import * as crypto from 'crypto';
import type { IOnboardingSessionStore } from '../../shared/interfaces/IOnboardingSessionStore.js';
import type { IOAuthStateStore } from '../../shared/interfaces/IOAuthStateStore.js';
import type { OnboardingSessionPayload } from '../../domain/instagram/onboarding.types.js';
import {
  ONBOARDING_KEY_PREFIX,
  OAUTH_STATE_PREFIX,
  ONBOARDING_TTL_SEC as DEFAULT_ONBOARDING_TTL_SEC,
} from '../../config/constants.js';
import { getRedisClient } from './redis.client.js';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createOnboardingSessionStore(): IOnboardingSessionStore {
  const client = getRedisClient();

  return {
    async set(
      payload: OnboardingSessionPayload,
      ttlSec: number = DEFAULT_ONBOARDING_TTL_SEC
    ): Promise<string> {
      const token = generateToken();
      const key = ONBOARDING_KEY_PREFIX + token;
      const value = JSON.stringify(payload);
      await client.set(key, value, 'EX', ttlSec);
      return token;
    },

    async consume(token: string): Promise<OnboardingSessionPayload | null> {
      const key = ONBOARDING_KEY_PREFIX + token;
      const multi = client.multi();
      multi.get(key);
      multi.del(key);
      const results = await multi.exec();
      const raw = results?.[0]?.[1];
      if (typeof raw !== 'string') return null;
      try {
        const parsed = JSON.parse(raw) as OnboardingSessionPayload;
        if (
          typeof parsed.igUserId === 'string' &&
          typeof parsed.igUsername === 'string' &&
          typeof parsed.accountType === 'string' &&
          Array.isArray(parsed.scopes) &&
          typeof parsed.accessTokenEnc === 'string' &&
          typeof parsed.tokenIv === 'string' &&
          typeof parsed.tokenExpiresAt === 'string'
        ) {
          return parsed;
        }
      } catch {
        /* invalid json */
      }
      return null;
    },
  };
}

/** Store OAuth state param for CSRF protection (state -> 'onboard'). */
export function createOAuthStateStore(ttlSec: number = 600): IOAuthStateStore {
  const client = getRedisClient();

  return {
    async set(state: string): Promise<void> {
      const key = OAUTH_STATE_PREFIX + state;
      await client.set(key, 'onboard', 'EX', ttlSec);
    },

    async validateAndConsume(state: string): Promise<boolean> {
      const key = OAUTH_STATE_PREFIX + state;
      const multi = client.multi();
      multi.get(key);
      multi.del(key);
      const results = await multi.exec();
      const value = results?.[0]?.[1];
      return value === 'onboard';
    },
  };
}
