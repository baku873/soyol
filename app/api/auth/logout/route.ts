import { NextResponse } from 'next/server';
import { requireCsrf } from '@/lib/csrf';
import { clearAuthCookie } from '@/lib/authCookies';

export async function DELETE(request: Request) {
  try {
    requireCsrf(request);
    const res = NextResponse.json({ success: true });
    clearAuthCookie(res);
    return res;
  } catch (err: any) {
    const status = err?.status || 500;
    const message = status === 403 ? 'CSRF validation failed' : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}
