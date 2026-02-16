// Instagram connection entity and DTOs — map to auth.instagram_connections

export interface IgConnection {
  id: string;
  userId: string;
  tenantId: string;
  igUserId: string;
  igUsername: string;
  igAccountType: string | null; // PERSONAL, BUSINESS, CREATOR
  accessTokenEnc: string; // AES-256-GCM encrypted long-lived token
  tokenIv: string;
  tokenExpiresAt: Date;
  scopes: string[];
  isActive: boolean;
  lastRefreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIgConnectionDto {
  userId: string;
  tenantId: string;
  igUserId: string;
  igUsername: string;
  igAccountType?: string | null;
  accessTokenEnc: string;
  tokenIv: string;
  tokenExpiresAt: Date;
  scopes: string[];
  isActive?: boolean;
}
