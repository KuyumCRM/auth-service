// TOTP-based MFA (Google Auth compatible).
import { authenticator } from 'otplib';

export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  generateUri(secret: string, email: string, issuer: string): string {
    return authenticator.keyuri(email, issuer, secret);
  }

  verify(code: string, secret: string): boolean {
    return authenticator.checkDelta(code, secret) !== null;
  }
}
