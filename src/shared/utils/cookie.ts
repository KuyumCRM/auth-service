/** Cookie options for refresh token — httpOnly, secure in production, strict SameSite. */
export function createRefreshCookieOptions(maxAgeSeconds: number, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
