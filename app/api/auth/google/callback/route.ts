import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertOauthUser } from '@/lib/users';
import { signAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is not set`);
  return v;
}

async function exchangeCodeForTokens(code: string) {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  return (await res.json()) as { access_token: string; id_token?: string };
}

function clearGoogleOAuthCookies(res: NextResponse) {
  const opts = { expires: new Date(0), path: '/' as const };
  res.cookies.set('google_oauth_state', '', opts);
  res.cookies.set('google_oauth_nonce', '', opts);
  res.cookies.set('google_oauth_redirect', '', opts);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      const r = NextResponse.redirect(new URL('/login?error=google_callback_missing', req.url));
      clearGoogleOAuthCookies(r);
      return r;
    }

    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('google_oauth_state')?.value;
    const redirectCookie = cookieStore.get('google_oauth_redirect')?.value;

    if (!stateCookie || stateCookie !== state) {
      const r = NextResponse.redirect(new URL('/login?error=google_state_mismatch', req.url));
      clearGoogleOAuthCookies(r);
      return r;
    }

    const redirect =
      redirectCookie && redirectCookie.startsWith('/') && !redirectCookie.startsWith('//')
        ? redirectCookie
        : '/dashboard';

    const { access_token } = await exchangeCodeForTokens(code);

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) {
      const r = NextResponse.redirect(new URL('/login?error=google_profile_failed', req.url));
      clearGoogleOAuthCookies(r);
      return r;
    }

    const profile = (await profileRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    const user = await upsertOauthUser({
      provider: 'google',
      providerId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email?.split('@')[0] || 'User',
      avatar: profile.picture,
    });

    if (!user || !user._id) {
      const r = NextResponse.redirect(new URL('/login?error=user_upsert_failed', req.url));
      clearGoogleOAuthCookies(r);
      return r;
    }

    const token = await signAuthJwt({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      provider: user.provider,
    });

    const res = NextResponse.redirect(new URL(redirect, req.url));
    setAuthCookie(res, token);
    clearGoogleOAuthCookies(res);
    return res;
  } catch {
    const r = NextResponse.redirect(new URL('/login?error=google_callback_failed', req.url));
    clearGoogleOAuthCookies(r);
    return r;
  }
}

