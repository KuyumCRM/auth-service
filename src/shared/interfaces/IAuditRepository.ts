// Port interface for audit log (append-only)
import type { CreateAuditLogDto } from '../../domain/audit/audit.types.js';

export interface IAuditRepository {
  create(data: CreateAuditLogDto): Promise<void>;
}
