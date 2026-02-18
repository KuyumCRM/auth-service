// Port interface for one-time tokens (email verify, password reset).
import type {
  OneTimeTokenType,
  OneTimeToken,
  CreateOneTimeTokenDto,
} from '../../domain/one-time-token/one-time-token.types.js';

export type { OneTimeTokenType, OneTimeToken, CreateOneTimeTokenDto };

export interface IOneTimeTokenRepository {
  create(data: CreateOneTimeTokenDto): Promise<OneTimeToken>;
  findByTokenHashAndType(
    tokenHash: string,
    type: OneTimeTokenType
  ): Promise<OneTimeToken | null>;
  markUsed(id: string): Promise<void>;
}
