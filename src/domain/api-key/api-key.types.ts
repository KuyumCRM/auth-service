// API key domain types — map to auth.api_keys

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateApiKeyDto {
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: Date | null;
}
