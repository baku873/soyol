import { NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'auth_token';

/** Use Secure cookies only when the public site URL is https (avoids losing sessions on http previews). */
function cookieSecure(): boolean {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').trim().toLowerCase();
  if (base.startsWith('https://')) return true;
  if (base.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
}

