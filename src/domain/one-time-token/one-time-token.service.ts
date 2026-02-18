// One-time token creation and validation. Used by password reset, email verification, MFA backup.
import type {
  OneTimeTokenType,
  OneTimeTokenServiceDeps,
  ValidateAndConsumeResult,
} from './one-time-token.types.js';
import { generateSecureToken, sha256 } from '../../shared/utils/index.js';
import { AppError } from '../../shared/errors/domain-errors.js';

export class OneTimeTokenService {
  constructor(private readonly deps: OneTimeTokenServiceDeps) {}

  /**
   * Create a one-time token. Returns the raw token (to send via email/link); caller must not store it.
   */
  async create(
    userId: string,
    type: OneTimeTokenType,
    expiresAt: Date
  ): Promise<string> {
    const rawToken = generateSecureToken();
    const tokenHash = sha256(rawToken);
    await this.deps.oneTimeTokenRepo.create({
      userId,
      tokenHash,
      type,
      expiresAt,
    });
    return rawToken;
  }

  /**
   * Validate token and mark as used. Returns userId on success; throws on invalid/expired/used.
   */
  async validateAndConsume(
    rawToken: string,
    type: OneTimeTokenType
  ): Promise<ValidateAndConsumeResult> {
    const tokenHash = sha256(rawToken);
    const ott = await this.deps.oneTimeTokenRepo.findByTokenHashAndType(
      tokenHash,
      type
    );
    if (!ott || ott.usedAt || ott.expiresAt < new Date()) {
      const message =
        type === 'password_reset'
          ? 'Invalid or expired reset token'
          : type === 'email_verify'
            ? 'Invalid or expired verification token'
            : 'Invalid or expired token';
      throw new AppError(message, 400);
    }
    await this.deps.oneTimeTokenRepo.markUsed(ott.id);
    return { userId: ott.userId };
  }
}
