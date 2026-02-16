import type { CreateAuditLogDto } from '../../../domain/audit/audit.types.js';
import type { IAuditRepository } from '../../../shared/interfaces/IAuditRepository.js';
import { AppDataSource } from '../data-source.js';
import { AuditLogEntity } from '../entities/AuditLog.entity.js';

export class AuditRepository implements IAuditRepository {
  private readonly repository = AppDataSource.getRepository(AuditLogEntity);

  async create(data: CreateAuditLogDto): Promise<void> {
    const entity = this.repository.create({
      eventType: data.eventType,
      userId: data.userId ?? null,
      tenantId: data.tenantId ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      metadata: data.metadata ?? null,
    });
    await this.repository.save(entity);
  }
}
