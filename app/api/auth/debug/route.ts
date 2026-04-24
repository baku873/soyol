import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthJwt } from '@/lib/jwt';

/**
 * Debug endpoint to diagnose admin redirect issues.
 * Safe output: never returns the raw JWT.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || null;
  const nodeEnv = process.env.NODE_ENV || null;
  const hasJwtSecret = !!process.env.JWT_SECRET;
  const jwtSecretLen = process.env.JWT_SECRET?.length || 0;
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase() || null;

  if (!token) {
    return NextResponse.json({
      ok: false,
      reason: 'no_auth_cookie',
      env: { nodeEnv, baseUrl, hasJwtSecret, jwtSecretLen, adminEmail },
    });
  }

  try {
    const payload = await verifyAuthJwt(token);
    return NextResponse.json({
      ok: true,
      jwt: {
        userId: payload.userId,
        email: payload.email || null,
        provider: payload.provider,
        role: payload.role || null,
        hasPhone: !!payload.phone,
      },
      env: { nodeEnv, baseUrl, hasJwtSecret, jwtSecretLen, adminEmail },
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      reason: 'jwt_verify_failed',
      error: e instanceof Error ? e.message : 'unknown',
      env: { nodeEnv, baseUrl, hasJwtSecret, jwtSecretLen, adminEmail },
    });
  }
}

