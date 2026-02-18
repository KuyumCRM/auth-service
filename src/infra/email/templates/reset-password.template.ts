export function resetPasswordHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset Password</title></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="margin-top: 0;">Reset your password</h2>
  <p>You requested a password reset. Click the link below to set a new password:</p>
  <p><a href="${resetLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
  <p style="font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
  <p style="font-size: 12px; color: #999;">This link expires in 1 hour.</p>
</body>
</html>
  `.trim();
}
