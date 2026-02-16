// JWT creation, validation, refresh token rotation with reuse detection.
import * as crypto from 'crypto';
import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  type CryptoKey,
} from 'jose';
import type { ITokenRepository } from '../../shared/interfaces/ITokenRepository.js';
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { TokenPair } from '../auth/auth.types.js';
import type {
  JwtPayload,
  IssueTokenOpts,
  CreateRefreshTokenDto,
  RotateTokenOpts,
} from './token.types.js';
import {
  InvalidTokenError,
  TokenExpiredError,
  TokenReuseDetectedError,
} from '../auth/auth.errors.js';

const RS256 = 'RS256';

export interface TokenServiceConfig {
  privateKeyPem: string;
  publicKeyPem: string;
  accessTtlSec: number;
  refreshTtlDays: number;
}

export class TokenService {
  constructor(
    private readonly tokenRepo: ITokenRepository,
    private readonly tenantRepo: ITenantRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly config: TokenServiceConfig
  ) {}

  private static sha256(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;

  private async getPrivateKey(): Promise<CryptoKey> {
    if (!this.privateKey) {
      this.privateKey = await importPKCS8(this.config.privateKeyPem, RS256);
    }
    return this.privateKey;
  }

  private async getPublicKey(): Promise<CryptoKey> {
    if (!this.publicKey) {
      this.publicKey = await importSPKI(this.config.publicKeyPem, RS256);
    }
    return this.publicKey;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async issueTokens(opts: IssueTokenOpts): Promise<TokenPair> {
    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const familyId = crypto.randomUUID();
    const tokenHash = TokenService.sha256(rawRefresh);
    const now = new Date();
    const expiresAt = this.addDays(now, this.config.refreshTtlDays);

    const createDto: CreateRefreshTokenDto = {
      userId: opts.userId,
      familyId,
      hash: tokenHash,
      deviceInfo: {
        ...opts.deviceInfo,
        email: opts.email,
        tenantId: opts.tenantId,
      },
      expiresAt,
    };
    await this.tokenRepo.create(createDto);

    const subscription = await this.tenantRepo.getSubscription(opts.tenantId);
    const jti = crypto.randomUUID();
    const exp = Math.floor(now.getTime() / 1000) + this.config.accessTtlSec;
    const iat = Math.floor(now.getTime() / 1000);

    const privateKey = await this.getPrivateKey();
    const accessToken = await new SignJWT({
      tenant_id: opts.tenantId,
      email: opts.email,
      subscription_tier: subscription.tier,
      feature_flags: subscription.featureFlags,
    })
      .setSubject(opts.userId)
      .setJti(jti)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: RS256 })
      .sign(privateKey);

    return { accessToken, refreshToken: rawRefresh };
  }

  async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
    const tokenHash = TokenService.sha256(rawToken);
    const existing = await this.tokenRepo.findByHash(tokenHash);

    if (!existing) {
      throw new InvalidTokenError();
    }

    if (existing.rotatedAt || existing.revokedAt) {
      await this.tokenRepo.revokeFamilyById(existing.familyId);
      await this.eventPublisher.publish('auth.token.family_revoked', {
        userId: existing.userId,
        reason: 'reuse_detected',
      });
      throw new TokenReuseDetectedError();
    }

    if (existing.expiresAt < new Date()) {
      throw new TokenExpiredError();
    }

    const newRawToken = crypto.randomBytes(64).toString('hex');
    const newHash = TokenService.sha256(newRawToken);
    const expiresAt = this.addDays(new Date(), this.config.refreshTtlDays);

    const rotateOpts: RotateTokenOpts = {
      oldHash: tokenHash,
      newHash,
      expiresAt,
    };
    const rotated = await this.tokenRepo.rotateToken(rotateOpts);

    const device = rotated.deviceInfo as {
      email?: string;
      tenantId?: string;
    } | undefined;
    const tenantId = device?.tenantId ?? '';
    const subscription = await this.tenantRepo.getSubscription(tenantId);
    const email = device?.email ?? '';
    const jti = crypto.randomUUID();
    const now = new Date();
    const exp = Math.floor(now.getTime() / 1000) + this.config.accessTtlSec;
    const iat = Math.floor(now.getTime() / 1000);

    const privateKey = await this.getPrivateKey();
    const accessToken = await new SignJWT({
      tenant_id: subscription.tenantId,
      email,
      subscription_tier: subscription.tier,
      feature_flags: subscription.featureFlags,
    })
      .setSubject(rotated.userId)
      .setJti(jti)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: RS256 })
      .sign(privateKey);

    return { accessToken, refreshToken: newRawToken };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const publicKey = await this.getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: [RS256],
    });
    return payload as unknown as JwtPayload;
  }

  async revokeToken(rawToken: string): Promise<void> {
    const tokenHash = TokenService.sha256(rawToken);
    const existing = await this.tokenRepo.findByHash(tokenHash);
    if (existing) {
      await this.tokenRepo.revokeFamilyById(existing.familyId);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.tokenRepo.revokeAllForUser(userId);
  }
}
