import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiter setup with safety checks
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(100, "60 s"),
      analytics: true,
    })
  : null;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET env variable is not set");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Paths that require authentication
const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/profile",
  "/orders",
  "/wishlist",
  "/addresses",
  "/settings",
];

// Paths that are for admins only
const adminRoutes = ["/admin"];

// Dedicated webhook path for on-demand ISR revalidation
const REVALIDATE_WEBHOOK_PATH = "/api/revalidate";

function getRevalidationSecretFromRequest(req: NextRequest): string | null {
  // Preferred: Authorization: Bearer <secret>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  // Fallback header
  const headerSecret = req.headers.get("x-revalidate-secret");
  if (headerSecret) return headerSecret.trim();

  // Fallback query string
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) return querySecret.trim();

  return null;
}

function isAuthorizedRevalidationRequest(req: NextRequest): boolean {
  const expected = process.env.REVALIDATION_SECRET;

  // Fail closed in production if secret is missing.
  // Dev escape hatch only when explicitly enabled.
  if (!expected) {
    return (
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_REVALIDATE_WITHOUT_SECRET === "true"
    );
  }

  const provided = getRevalidationSecretFromRequest(req);
  if (!provided) return false;

  return provided === expected;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "127.0.0.1";

  // 0. Dedicated authorization gate for revalidation webhook
  if (pathname === REVALIDATE_WEBHOOK_PATH) {
    if (!isAuthorizedRevalidationRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorized webhook call: skip JWT route protections and continue.
    return NextResponse.next();
  }

  // 1. Rate Limiting for API routes
  if (pathname.startsWith("/api/")) {
    if (ratelimit) {
      try {
        const { success, limit, reset, remaining } = await ratelimit.limit(
          `ratelimit_${ip}`,
        );

        if (!success) {
          return NextResponse.json(
            { error: "Too many requests" },
            {
              status: 429,
              headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            },
          );
        }
      } catch (err) {
        console.error("Rate limiting error:", err);
      }
    }
  }

  // 2. Auth checks (Custom JWT Auth)
  const token = req.cookies.get("auth_token")?.value;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    if (!token) {
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      if (isAdminRoute && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return NextResponse.next();
    } catch {
      const url = new URL("/sign-in", req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
