// Port interface for API key store (M2M authentication)
import type { ApiKey, CreateApiKeyDto } from '../../domain/api-key/api-key.types.js';

export interface IApiKeyRepository {
  findByKeyHash(hash: string): Promise<ApiKey | null>;
  findById(id: string): Promise<ApiKey | null>;
  create(data: CreateApiKeyDto): Promise<ApiKey>;
  revoke(id: string): Promise<void>;
  updateLastUsed(id: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
