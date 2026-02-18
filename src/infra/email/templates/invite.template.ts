export function inviteHtml(inviteLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>You're Invited</title></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="margin-top: 0;">You're invited to join a workspace</h2>
  <p>Someone invited you to join their workspace on Kuyum. Click the link below to accept:</p>
  <p><a href="${inviteLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
  <p style="font-size: 14px; color: #666;">If you didn't expect this invitation, you can safely ignore this email.</p>
</body>
</html>
  `.trim();
}
