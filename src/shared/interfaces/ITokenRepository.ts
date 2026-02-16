// Port interface for refresh token store.
import type {
  RefreshToken,
  CreateRefreshTokenDto,
  RotateTokenOpts,
} from '../../domain/token/token.types.js';

export interface ITokenRepository {
  findByHash(hash: string): Promise<RefreshToken | null>;
  create(data: CreateRefreshTokenDto): Promise<RefreshToken>;
  rotateToken(opts: RotateTokenOpts): Promise<RefreshToken>;
  revokeFamilyById(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
