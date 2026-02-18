import { Resend } from 'resend';
import type { IEmailSender } from '../../shared/interfaces/IEmailSender.js';
import { resetPasswordHtml } from './templates/reset-password.template.js';
import { inviteHtml } from './templates/invite.template.js';

export function createResendEmailSender(
  apiKey: string,
  fromEmail: string
): IEmailSender {
  const resend = new Resend(apiKey);

  return {
    async sendResetPasswordEmail(to: string, resetLink: string): Promise<void> {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: 'Reset your password',
        html: resetPasswordHtml(resetLink),
      });
      if (error) {
        throw new Error(`Resend sendResetPasswordEmail failed: ${error.message}`);
      }
    },
    async sendInviteEmail(to: string, inviteLink: string): Promise<void> {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: "You're invited to join a workspace",
        html: inviteHtml(inviteLink),
      });
      if (error) {
        throw new Error(`Resend sendInviteEmail failed: ${error.message}`);
      }
    },
  };
}
