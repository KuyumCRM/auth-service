import * as crypto from 'crypto';

/** SHA-256 hash of input string (hex-encoded). */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Generate a cryptographically secure random token (hex-encoded). */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
