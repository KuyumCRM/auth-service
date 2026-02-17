// Port interface for sending emails (password reset, invites, etc.).

export interface IEmailSender {
  sendResetPasswordEmail(to: string, resetLink: string): Promise<void>;
  sendInviteEmail(to: string, inviteLink: string): Promise<void>;
}
