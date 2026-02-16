// Audit log domain types — map to auth.audit_log

export interface AuditLogEntry {
  id: string;
  eventType: string;
  userId: string | null;
  tenantId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  eventType: string;
  userId?: string | null;
  tenantId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
