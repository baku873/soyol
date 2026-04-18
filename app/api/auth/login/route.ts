import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireCsrf } from '@/lib/csrf';
import { rateLimitLogin } from '@/lib/rateLimit';
import { findUserByEmail, toPublicUser } from '@/lib/users';
import { signAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    requireCsrf(request);

    const ip = getClientIp(request);
    const limited = await rateLimitLogin(ip);
    if (!limited.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    const user = await findUserByEmail(email);
    if (!user) {
      console.warn('[auth/login] failed', { at: new Date().toISOString(), ip, reason: 'user_not_found' });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!user.password) {
      console.warn('[auth/login] failed', { at: new Date().toISOString(), ip, reason: 'oauth_only' });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.warn('[auth/login] failed', { at: new Date().toISOString(), ip, reason: 'bad_password' });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signAuthJwt({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      provider: user.provider,
    });

    const res = NextResponse.json({ success: true, user: toPublicUser(user) });
    setAuthCookie(res, token);
    return res;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'ZodError' && 'format' in err) {
      const z = err as { format: () => unknown };
      return NextResponse.json({ error: 'Validation error', details: z.format() }, { status: 400 });
    }
    const status =
      err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
    const message =
      status === 403
        ? 'CSRF validation failed'
        : err instanceof Error
          ? err.message
          : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}
