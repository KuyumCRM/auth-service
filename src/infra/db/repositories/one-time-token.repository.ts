import type {
  IOneTimeTokenRepository,
  OneTimeToken,
  OneTimeTokenType,
  CreateOneTimeTokenDto,
} from '../../../shared/interfaces/IOneTimeTokenRepository.js';
import { AppDataSource } from '../data-source.js';
import { OneTimeTokenEntity } from '../entities/OneTimeToken.entity.js';

function entityToToken(entity: OneTimeTokenEntity): OneTimeToken {
  return {
    id: entity.id,
    userId: entity.userId,
    tokenHash: entity.tokenHash,
    type: entity.type as OneTimeTokenType,
    expiresAt: entity.expiresAt,
    usedAt: entity.usedAt,
    createdAt: entity.createdAt,
  };
}

export class OneTimeTokenRepository implements IOneTimeTokenRepository {
  private readonly repository = AppDataSource.getRepository(OneTimeTokenEntity);

  async create(data: CreateOneTimeTokenDto): Promise<OneTimeToken> {
    const entity = this.repository.create({
      userId: data.userId,
      tokenHash: data.tokenHash,
      type: data.type,
      expiresAt: data.expiresAt,
    });
    const saved = await this.repository.save(entity);
    return entityToToken(saved);
  }

  async findByTokenHashAndType(
    tokenHash: string,
    type: OneTimeTokenType
  ): Promise<OneTimeToken | null> {
    const entity = await this.repository.findOne({
      where: { tokenHash, type },
    });
    return entity ? entityToToken(entity) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.repository.update({ id }, { usedAt: new Date() });
  }
}
