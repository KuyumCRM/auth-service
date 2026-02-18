/** One-time token types: email verification, password reset, MFA backup. */
export type OneTimeTokenType = 'email_verify' | 'password_reset' | 'mfa_backup';

export interface OneTimeToken {
  id: string;
  userId: string;
  tokenHash: string;
  type: OneTimeTokenType;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateOneTimeTokenDto {
  userId: string;
  tokenHash: string;
  type: OneTimeTokenType;
  expiresAt: Date;
}
