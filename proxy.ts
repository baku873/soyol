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

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/api/auth(.*)',
]);

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Locale is client-side (LanguageContext), not a URL prefix. Old or mistaken /mn URLs → real routes.
  if (pathname === '/mn' || pathname.startsWith('/mn/')) {
    const targetPath = pathname === '/mn' ? '/' : pathname.slice('/mn'.length) || '/';
    return NextResponse.redirect(new URL(targetPath, req.url));
  }

  // Always allow public routes through without our JWT check.
  if (isPublicRoute(req)) return NextResponse.next();

  // ── Admin routes: require valid JWT + role === 'admin' ──────────
  if (isAdminRoute(req)) {
    const token = req.cookies.get('auth_token')?.value;

    // No token → redirect to login with a redirect-back param
    if (!token) {
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const payload = await verifyAuthJwt(token);

      // Authenticated but NOT admin → send home
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Admin ✓ — forward identity headers to downstream server components
      const headers = new Headers(req.headers);
      headers.set('x-auth-user-id', payload.userId);
      if (payload.email) headers.set('x-auth-user-email', payload.email);
      headers.set('x-auth-user-name', payload.name);
      headers.set('x-auth-user-provider', payload.provider);
      headers.set('x-auth-user-role', payload.role);
      return NextResponse.next({ request: { headers } });
    } catch {
      // Invalid / expired token → redirect to login
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // ── Dashboard routes: require valid JWT (any role) ─────────────
  if (isProtectedRoute(req)) {
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
      if (payload.role) headers.set('x-auth-user-role', payload.role);
      return NextResponse.next({ request: { headers } });
    } catch {
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // All other routes pass through
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

