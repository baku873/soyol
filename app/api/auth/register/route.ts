import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireCsrf } from '@/lib/csrf';
import { createLocalUser, findUserByEmail, toPublicUser } from '@/lib/users';
import { signAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';

const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: passwordPolicy,
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(request: Request) {
  try {
    requireCsrf(request);
    const body = await request.json();
    const parsed = RegisterSchema.parse(body);

    const existing = await findUserByEmail(parsed.email);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const user = await createLocalUser({
      name: parsed.name,
      email: parsed.email,
      passwordHash,
    });

    if (!user || !user._id) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const token = await signAuthJwt({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
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
