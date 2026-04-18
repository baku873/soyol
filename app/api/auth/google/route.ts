import { NextResponse } from 'next/server';
import crypto from 'crypto';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is not set`);
  return v;
}

/** Only same-origin relative paths — Google will not echo custom params on callback. */
function sanitizePostAuthRedirect(raw: string | null): string {
  const fallback = '/dashboard';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

export async function GET(req: Request) {
  try {
    const clientId = getEnv('GOOGLE_CLIENT_ID');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const afterAuth = sanitizePostAuthRedirect(new URL(req.url).searchParams.get('redirect'));

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);

    const res = NextResponse.redirect(url);
    res.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
    res.cookies.set('google_oauth_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
    res.cookies.set('google_oauth_redirect', afterAuth, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}