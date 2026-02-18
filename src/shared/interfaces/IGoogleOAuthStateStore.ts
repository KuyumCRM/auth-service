// Port for Google OAuth state (payload with mode + optional onboardingToken).

export interface GoogleStatePayload {
  mode: 'login' | 'signup';
  onboardingToken?: string;
}

export interface IGoogleOAuthStateStore {
  set(state: string, payload: GoogleStatePayload): Promise<void>;
  validateAndConsume(state: string): Promise<GoogleStatePayload | null>;
}
