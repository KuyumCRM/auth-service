import type { OneTimeTokenService } from '../one-time-token/one-time-token.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from '../token/token.service.js';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';

/** Result of password policy validation (e.g. length, complexity). */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Input for forgot password flow. */
export interface ForgotPasswordDto {
  email: string;
}

/** Input for reset password flow. */
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface PasswordResetServiceDeps {
  userRepo: IUserRepository;
  oneTimeTokenService: OneTimeTokenService;
  emailSender: IEmailSender;
  passwordService: PasswordService;
  tokenService: TokenService;
  auditRepo: IAuditRepository;
  resetPasswordBaseUrl: string;
}
