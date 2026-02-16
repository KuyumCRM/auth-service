import type {
  IgConnection,
  CreateIgConnectionDto,
} from '../../../domain/instagram/instagram.types.js';
import type { IInstagramTokenRepository } from '../../../shared/interfaces/IInstagramTokenRepository.js';
import { LessThan } from 'typeorm';
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

  async findByUserAndIgId(userId: string, igUserId: string): Promise<IgConnection | null> {
    const entity = await this.repository.findOne({
      where: { userId, igUserId },
    });
    return entity ? entityToIgConnection(entity) : null;
  }

  async findExpiringBefore(date: Date): Promise<IgConnection[]> {
    const entities = await this.repository.find({
      where: { tokenExpiresAt: LessThan(date), isActive: true },
      order: { tokenExpiresAt: 'ASC' },
    });
    return entities.map(entityToIgConnection);
  }

  async create(data: CreateIgConnectionDto): Promise<IgConnection> {
    const entity = this.repository.create({
      userId: data.userId,
      tenantId: data.tenantId,
      igUserId: data.igUserId,
      igUsername: data.igUsername,
      igAccountType: data.igAccountType ?? null,
      accessTokenEnc: data.accessTokenEnc,
      tokenIv: data.tokenIv,
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes,
      isActive: data.isActive ?? true,
    });
    const saved = await this.repository.save(entity);
    return entityToIgConnection(saved);
  }

  async updateToken(
    id: string,
    accessTokenEnc: string,
    tokenIv: string,
    tokenExpiresAt: Date
  ): Promise<void> {
    await this.repository.update(
      { id },
      { accessTokenEnc, tokenIv, tokenExpiresAt, lastRefreshedAt: new Date(), updatedAt: new Date() }
    );
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false, updatedAt: new Date() });
  }
}
