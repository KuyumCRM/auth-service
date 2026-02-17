// Port for short-lived onboarding session (Instagram-first signup gating).
import type { OnboardingSessionPayload } from '../../domain/instagram/onboarding.types.js';

export interface IOnboardingSessionStore {
  /** Store payload under token; TTL in seconds. Returns the token (opaque id). */
  set(payload: OnboardingSessionPayload, ttlSec: number): Promise<string>;

  /** Get and delete payload (one-time consumption). Returns null if missing or expired. */
  consume(token: string): Promise<OnboardingSessionPayload | null>;
}
