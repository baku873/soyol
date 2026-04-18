import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthJwt } from '@/lib/jwt';

// Helper to match paths
function createRouteMatcher(patterns: string[]) {
  return (req: NextRequest) => {
    return patterns.some((pattern) => {
      const regex = new RegExp(`^${pattern.replace(/\(\.\*\)/g, '.*')}$`);
      return regex.test(req.nextUrl.pathname);
    });
  };
}

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/api/auth(.*)',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes through without our JWT check.
  if (isPublicRoute(req)) return NextResponse.next();

  // Only protect dashboard routes with OUR JWT.
  if (!isProtectedRoute(req)) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verifyAuthJwt(token);
    const headers = new Headers(req.headers);
    headers.set('x-auth-user-id', payload.userId);
    if (payload.email) headers.set('x-auth-user-email', payload.email);
    headers.set('x-auth-user-name', payload.name);
    headers.set('x-auth-user-provider', payload.provider);
    return NextResponse.next({ request: { headers } });
  } catch {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
