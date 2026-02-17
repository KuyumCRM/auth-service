import type {
  IgConnection,
  CreateIgConnectionDto,
} from '../../../domain/instagram/instagram.types.js';
import type { IInstagramTokenRepository } from '../../../shared/interfaces/IInstagramTokenRepository.js';
import { AppDataSource } from '../data-source.js';
import { InstagramConnectionEntity } from '../entities/InstagramConnection.entity.js';

function entityToIgConnection(entity: InstagramConnectionEntity): IgConnection {
  return {
    id: entity.id,
    userId: entity.userId,
    tenantId: entity.tenantId,
    igUserId: entity.igUserId,
    igUsername: entity.igUsername,
    igAccountType: entity.igAccountType,
    accessTokenEnc: entity.accessTokenEnc,
    tokenIv: entity.tokenIv,
    tokenExpiresAt: entity.tokenExpiresAt,
    scopes: entity.scopes,
    isActive: entity.isActive,
    lastRefreshedAt: entity.lastRefreshedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class InstagramTokenRepository implements IInstagramTokenRepository {
  private readonly repository = AppDataSource.getRepository(InstagramConnectionEntity);

  async findByUserId(userId: string): Promise<IgConnection[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(entityToIgConnection);
  }

  async findByIgUserId(igUserId: string): Promise<IgConnection | null> {
    const entity = await this.repository.findOne({
      where: { igUserId, isActive: true },
    });
    return entity ? entityToIgConnection(entity) : null;
  }

  async create(data: CreateIgConnectionDto): Promise<IgConnection> {
    const entity = this.repository.create({
      ...data,
      igAccountType: data.igAccountType ?? null,
      isActive: data.isActive ?? true,
    });
    const saved = await this.repository.save(entity);
    return entityToIgConnection(saved);
  }
}
