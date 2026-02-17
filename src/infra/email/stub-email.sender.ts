// Stub email sender — no-op (replace with real implementation for production).
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';

export function createStubEmailSender(): IEmailSender {
  return {
    async sendResetPasswordEmail(_to: string, _resetLink: string): Promise<void> {
      // No-op; replace with SES, SendGrid, etc.
    },
    async sendInviteEmail(_to: string, _inviteLink: string): Promise<void> {
      // No-op; replace with SES, SendGrid, etc.
    },
  };
}
