import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthJwt } from '@/lib/jwt';
import { findUserById, toPublicUser } from '@/lib/users';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAuthJwt(token);
    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user: toPublicUser(user) });

  } catch (error) {
    // console.error('Me API Error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
