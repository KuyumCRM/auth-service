// Forgot password and reset password flows. Uses one-time tokens for secure token-based reset.
import type {
  ForgotPasswordDto,
  ResetPasswordDto,
  PasswordResetServiceDeps,
} from './password.types.js';
import { PASSWORD_RESET_EXPIRY_HOURS } from '../../config/constants.js';
import { AppError } from '../../shared/errors/domain-errors.js';

export class PasswordResetService {
  constructor(private readonly deps: PasswordResetServiceDeps) {}

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.deps.userRepo.findByEmail(dto.email);
    if (!user) {
      return;
    }
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
    const rawToken = await this.deps.oneTimeTokenService.create(
      user.id,
      'password_reset',
      expiresAt
    );
    const resetLink = `${this.deps.resetPasswordBaseUrl}?token=${encodeURIComponent(rawToken)}`;
    await this.deps.emailSender.sendResetPasswordEmail(user.email, resetLink);
    await this.deps.auditRepo.create({
      eventType: 'password_reset_requested',
      userId: user.id,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { userId } = await this.deps.oneTimeTokenService.validateAndConsume(
      dto.token,
      'password_reset'
    );
    const policyResult = this.deps.passwordService.validatePolicy(dto.newPassword);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join('; '), 400);
    }
    const passwordHash = await this.deps.passwordService.hash(dto.newPassword);
    await this.deps.userRepo.update(userId, { passwordHash });
    await this.deps.tokenService.revokeAllForUser(userId);
    await this.deps.auditRepo.create({
      eventType: 'password_reset_completed',
      userId,
    });
  }
}
