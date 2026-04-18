import crypto from 'crypto';
import { NextResponse } from 'next/server';

const CSRF_COOKIE = 'csrf_token';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: NextResponse, token: string) {
  // Double-submit cookie pattern: JS can read it and send header back.
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2,
    path: '/',
  });
}

export function requireCsrf(req: Request) {
  const header = req.headers.get('x-csrf-token');
  const cookieHeader = req.headers.get('cookie') || '';
  const csrfFromCookie = cookieHeader
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CSRF_COOKIE}=`))
    ?.split('=')[1];

  if (!header || !csrfFromCookie || header !== csrfFromCookie) {
    const err = new Error('CSRF token missing or invalid');
    (err as any).status = 403;
    throw err;
  }
}

