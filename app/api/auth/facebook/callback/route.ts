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

async function exchangeCodeForToken(code: string) {
  const clientId = getEnv('FACEBOOK_CLIENT_ID');
  const clientSecret = getEnv('FACEBOOK_CLIENT_SECRET');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const res = await fetch(tokenUrl.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook token exchange failed: ${text}`);
  }
  return (await res.json()) as { access_token: string };
}

function clearFacebookOAuthCookies(res: NextResponse) {
  const opts = { expires: new Date(0), path: '/' as const };
  res.cookies.set('facebook_oauth_state', '', opts);
  res.cookies.set('facebook_oauth_redirect', '', opts);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      const r = NextResponse.redirect(new URL('/login?error=facebook_callback_missing', req.url));
      clearFacebookOAuthCookies(r);
      return r;
    }

    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('facebook_oauth_state')?.value;
    const redirectCookie = cookieStore.get('facebook_oauth_redirect')?.value;

    if (!stateCookie || stateCookie !== state) {
      const r = NextResponse.redirect(new URL('/login?error=facebook_state_mismatch', req.url));
      clearFacebookOAuthCookies(r);
      return r;
    }

    const redirect =
      redirectCookie && redirectCookie.startsWith('/') && !redirectCookie.startsWith('//')
        ? redirectCookie
        : '/dashboard';

    const { access_token } = await exchangeCodeForToken(code);

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
    profileUrl.searchParams.set('access_token', access_token);

    const profileRes = await fetch(profileUrl.toString());
    if (!profileRes.ok) {
      const r = NextResponse.redirect(new URL('/login?error=facebook_profile_failed', req.url));
      clearFacebookOAuthCookies(r);
      return r;
    }

    const profile = (await profileRes.json()) as {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    const user = await upsertOauthUser({
      provider: 'facebook',
      providerId: profile.id,
      email: profile.email,
      name: profile.name || profile.email?.split('@')[0] || 'User',
      avatar: profile.picture?.data?.url,
    });

    if (!user || !user._id) {
      const r = NextResponse.redirect(new URL('/login?error=user_upsert_failed', req.url));
      clearFacebookOAuthCookies(r);
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
    clearFacebookOAuthCookies(res);
    return res;
  } catch (err) {
    console.error('Facebook OAuth callback error:', err);
    const r = NextResponse.redirect(new URL('/login?error=facebook_callback_failed', req.url));
    clearFacebookOAuthCookies(r);
    return r;
  }
}
