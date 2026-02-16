// Port interface for one-time tokens (email verify, password reset).
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

export interface IOneTimeTokenRepository {
  create(data: CreateOneTimeTokenDto): Promise<OneTimeToken>;
  findByTokenHashAndType(
    tokenHash: string,
    type: OneTimeTokenType
  ): Promise<OneTimeToken | null>;
  markUsed(id: string): Promise<void>;
}
