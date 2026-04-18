import { NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'auth_token';

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
}

