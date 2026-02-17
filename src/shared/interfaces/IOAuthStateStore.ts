// Port for OAuth state param (CSRF protection).

export interface IOAuthStateStore {
  /** Store state param with TTL. */
  set(state: string): Promise<void>;

  /** Validate and delete state (one-time consumption). Returns true if valid. */
  validateAndConsume(state: string): Promise<boolean>;
}
