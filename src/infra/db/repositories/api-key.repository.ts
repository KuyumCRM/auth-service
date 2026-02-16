import type { ApiKey, CreateApiKeyDto } from '../../../domain/api-key/api-key.types.js';
import type { IApiKeyRepository } from '../../../shared/interfaces/IApiKeyRepository.js';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source.js';
import { ApiKeyEntity } from '../entities/ApiKey.entity.js';

function entityToApiKey(entity: ApiKeyEntity): ApiKey {
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    name: entity.name,
    keyPrefix: entity.keyPrefix,
    keyHash: entity.keyHash,
    scopes: entity.scopes,
    lastUsedAt: entity.lastUsedAt,
    expiresAt: entity.expiresAt,
    revokedAt: entity.revokedAt,
    createdAt: entity.createdAt,
  };
}

export function createApiKeyRepository(tenantId: string): IApiKeyRepository {
  const repository = AppDataSource.getRepository(ApiKeyEntity);

  return {
    async findByKeyHash(hash: string): Promise<ApiKey | null> {
      const entity = await repository.findOne({
        where: { keyHash: hash, revokedAt: IsNull() },
      });
      return entity ? entityToApiKey(entity) : null;
    },

    async findById(id: string): Promise<ApiKey | null> {
      const entity = await repository.findOne({
        where: { id, tenantId },
      });
      return entity ? entityToApiKey(entity) : null;
    },

    async create(data: CreateApiKeyDto): Promise<ApiKey> {
      const entity = repository.create({
        tenantId: data.tenantId,
        name: data.name,
        keyPrefix: data.keyPrefix,
        keyHash: data.keyHash,
        scopes: data.scopes,
        expiresAt: data.expiresAt ?? null,
      });
      const saved = await repository.save(entity);
      return entityToApiKey(saved);
    },

    async revoke(id: string): Promise<void> {
      await repository.update({ id, tenantId }, { revokedAt: new Date() });
    },

    async updateLastUsed(id: string): Promise<void> {
      await repository.update({ id }, { lastUsedAt: new Date() });
    },

    async deleteExpired(): Promise<number> {
      const result = await repository
        .createQueryBuilder()
        .delete()
        .where('expires_at IS NOT NULL AND expires_at < :now', { now: new Date() })
        .execute();
      return result.affected ?? 0;
    },
  };
}
