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
    tenantId: entity.tenantId,
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
  private readonly repo = AppDataSource.getRepository(RefreshTokenEntity);

  async findByHash(hash: string): Promise<RefreshToken | null> {
    const entity = await this.repo.findOne({
      where: { tokenHash: hash },
    });
    return entity ? entityToRefreshToken(entity) : null;
  }

  async create(data: CreateRefreshTokenDto): Promise<RefreshToken> {
    const entity = this.repo.create({
      userId: data.userId,
      tenantId: data.tenantId,
      tokenHash: data.hash,
      familyId: data.familyId,
      deviceInfo: data.deviceInfo,
      expiresAt: data.expiresAt,
    });
    const saved = await this.repo.save(entity);
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
        tenantId: old.tenantId,
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
    await this.repo.update({ familyId }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId }, { revokedAt: new Date() });
  }
}
