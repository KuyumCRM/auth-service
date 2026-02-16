// Port interface for Instagram token/connection store.
import type {
  IgConnection,
  CreateIgConnectionDto,
} from '../../domain/instagram/instagram.types.js';

export interface IInstagramTokenRepository {
  findByUserAndIgId(userId: string, igUserId: string): Promise<IgConnection | null>;
  findExpiringBefore(date: Date): Promise<IgConnection[]>;
  create(data: CreateIgConnectionDto): Promise<IgConnection>;
  updateToken(
    id: string,
    accessTokenEnc: string,
    tokenIv: string,
    tokenExpiresAt: Date
  ): Promise<void>;
  deactivate(id: string): Promise<void>;
}
