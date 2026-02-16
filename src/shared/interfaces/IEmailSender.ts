// Port interface for sending emails (password reset, etc.).

export interface IEmailSender {
  sendResetPasswordEmail(to: string, resetLink: string): Promise<void>;
}
