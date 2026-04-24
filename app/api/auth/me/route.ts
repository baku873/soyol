import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signAuthJwt, verifyAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';
import { findUserById, toPublicUser } from '@/lib/users';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    let payload;
    try {
      payload = await verifyAuthJwt(token);
    } catch {
      return NextResponse.json({ user: null });
    }

    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ user: null });

    const publicUser = toPublicUser(user);
    const res = NextResponse.json({ user: publicUser });

    // If role in DB differs from role in JWT, refresh cookie so middleware sees the updated role.
    const dbRole = publicUser.role || 'user';
    const jwtRole = payload.role || 'user';
    if (dbRole !== jwtRole) {
      const refreshed = await signAuthJwt({
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        provider: payload.provider,
        phone: payload.phone,
        role: dbRole,
      });
      setAuthCookie(res, refreshed);
    }

    return res;
  } catch {
    return NextResponse.json({ user: null });
  }
}
