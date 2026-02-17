// Port interface for Instagram token/connection store.
import type {
  IgConnection,
  CreateIgConnectionDto,
} from '../../domain/instagram/instagram.types.js';

export interface IInstagramTokenRepository {
  findByUserId(userId: string): Promise<IgConnection[]>;
  findByIgUserId(igUserId: string): Promise<IgConnection | null>;
  create(data: CreateIgConnectionDto): Promise<IgConnection>;
}
