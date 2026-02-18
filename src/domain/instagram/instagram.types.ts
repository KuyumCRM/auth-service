// Instagram connection entity and DTOs — map to auth.instagram_connections
import type { IOnboardingSessionStore } from '../../shared/interfaces/IOnboardingSessionStore.js';
import type { IOAuthStateStore } from '../../shared/interfaces/IOAuthStateStore.js';
import type { IInstagramTokenRepository } from '../../shared/interfaces/IInstagramTokenRepository.js';
import type { IEncryption } from '../../shared/interfaces/IEncryption.js';

export interface InstagramOAuthServiceDeps {
  onboardingSessionStore: IOnboardingSessionStore;
  oauthStateStore: IOAuthStateStore;
  instagramRepo: IInstagramTokenRepository;
  encryption: IEncryption;
  redirectUri: string;
  appId: string;
  appSecret: string;
  onboardingTtlSec: number;
}

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
