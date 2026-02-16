import type {
  RefreshToken,
  CreateRefreshTokenDto,
  RotateTokenOpts,
} from '../../../domain/token/token.types.js';
import type { ITokenRepository } from '../../../shared/interfaces/ITokenRepository.js';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source.js';
import { RefreshTokenEntity } from '../entities/RefreshToken.entity.js';

function entityToRefreshToken(entity: RefreshTokenEntity): RefreshToken {
  return {
    id: entity.id,
    userId: entity.userId,
    hash: entity.tokenHash,
    familyId: entity.familyId,
    deviceInfo: entity.deviceInfo ?? {},
    expiresAt: entity.expiresAt,
    rotatedAt: entity.rotatedAt,
    revokedAt: entity.revokedAt,
    createdAt: entity.createdAt,
  };
}

export class TokenRepository implements ITokenRepository {
  async findByHash(hash: string): Promise<RefreshToken | null> {
    const repository = AppDataSource.getRepository(RefreshTokenEntity);
    const entity = await repository.findOne({
      where: { tokenHash: hash },
    });
    return entity ? entityToRefreshToken(entity) : null;
  }

  async create(data: CreateRefreshTokenDto): Promise<RefreshToken> {
    const repository = AppDataSource.getRepository(RefreshTokenEntity);
    const entity = repository.create({
      userId: data.userId,
      tokenHash: data.hash,
      familyId: data.familyId,
      deviceInfo: data.deviceInfo,
      expiresAt: data.expiresAt,
    });
    const saved = await repository.save(entity);
    return entityToRefreshToken(saved);
  }

  async rotateToken(opts: RotateTokenOpts): Promise<RefreshToken> {
    return AppDataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshTokenEntity);
      const old = await repository.findOne({
        where: { tokenHash: opts.oldHash, revokedAt: IsNull() },
      });
      if (!old) {
        throw new Error('Token not found or already rotated/revoked');
      }
      await repository.update({ id: old.id }, { rotatedAt: new Date() });
      const newEntity = repository.create({
        userId: old.userId,
        tokenHash: opts.newHash,
        familyId: old.familyId,
        deviceInfo: old.deviceInfo ?? {},
        expiresAt: opts.expiresAt,
      });
      const saved = await repository.save(newEntity);
      return entityToRefreshToken(saved);
    });
  }

  async revokeFamilyById(familyId: string): Promise<void> {
    const repository = AppDataSource.getRepository(RefreshTokenEntity);
    await repository.update({ familyId }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const repository = AppDataSource.getRepository(RefreshTokenEntity);
    await repository.update({ userId }, { revokedAt: new Date() });
  }

  async deleteExpired(): Promise<number> {
    const repository = AppDataSource.getRepository(RefreshTokenEntity);
    const result = await repository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
}
