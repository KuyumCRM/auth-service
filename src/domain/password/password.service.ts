// bcrypt hash/verify, policy enforcement.
import * as bcrypt from 'bcrypt';
import { BCRYPT_COST, PASSWORD_MIN_LENGTH } from '../../config/constants.js';
import type { ValidationResult } from './password.types.js';

export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePolicy(password: string): ValidationResult {
    const errors: string[] = [];
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
