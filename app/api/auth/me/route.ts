import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthJwt } from '@/lib/jwt';
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

    return NextResponse.json({ user: toPublicUser(user) });
  } catch {
    return NextResponse.json({ user: null });
  }
}
