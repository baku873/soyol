import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireCsrf } from '@/lib/csrf';
import { rateLimitLogin } from '@/lib/rateLimit';
import { findUserByEmail, findUserByPhoneLoose, toPublicUser } from '@/lib/users';
import { signAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';

const PasswordSchema = z.string().min(1, 'Нууц үг шаардлагатай');

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
    const password = PasswordSchema.parse(body.password);

    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    const phoneDigits = phoneRaw.replace(/\D/g, '');
    const emailOk = emailRaw.length > 0 && z.string().email().safeParse(emailRaw).success;

    let user: Awaited<ReturnType<typeof findUserByEmail>> = null;
    if (emailOk) {
      user = await findUserByEmail(emailRaw.toLowerCase());
    } else if (phoneDigits.length >= 8) {
      user = await findUserByPhoneLoose(phoneRaw);
    } else {
      return NextResponse.json(
        { error: 'Утасны дугаар (8+ орон) эсвэл зөв и-мэйл оруулна уу' },
        { status: 400 },
      );
    }
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
      name: user.name || 'Хэрэглэгч',
      provider: user.provider,
      phone: user.phone,
      role: user.role || 'user',
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
