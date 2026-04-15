import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  CacheTags,
  getBannerInvalidationTags,
  getCategoryInvalidationTags,
  getProductInvalidationTags,
  uniqueTags,
} from "@/lib/cache-tags";

/**
 * Force dynamic so webhook requests are never statically optimized.
 */
export const dynamic = "force-dynamic";

/**
 * Optional fallback safety net for this route's own data cache behavior.
 * Main ISR safety net should still be set on pages/fetches (e.g. 86400).
 */
export const revalidate = 86400;

type RevalidatePayload =
  | {
      type: "product";
      productId: string;
      category?: string | null;
      storeId?: string | null;
      sections?: string[] | null;
      paths?: string[];
      tags?: string[];
    }
  | {
      type: "category";
      categorySlug: string;
      paths?: string[];
      tags?: string[];
    }
  | {
      type: "banners";
      paths?: string[];
      tags?: string[];
    }
  | {
      type: "path";
      paths: string[];
      tags?: string[];
    }
  | {
      type: "tag";
      tags: string[];
      paths?: string[];
    }
  | {
      type: "bulk";
      tags?: string[];
      paths?: string[];
    };

function getSecretFromRequest(req: NextRequest): string | null {
  // Prefer Authorization: Bearer <secret>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  // Fallback: x-revalidate-secret header
  const headerSecret = req.headers.get("x-revalidate-secret");
  if (headerSecret) return headerSecret.trim();

  // Fallback: query param for simple webhook providers
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) return querySecret.trim();

  return null;
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.REVALIDATION_SECRET;
  if (!expected) {
    // Fail closed in production if secret is missing.
    // In development, allow explicit empty secret only if developer opted-in.
    const allowInDev =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_REVALIDATE_WITHOUT_SECRET === "true";
    return allowInDev;
  }

  const provided = getSecretFromRequest(req);
  if (!provided) return false;

  // Constant-time compare is preferable for high-risk endpoints,
  // but for token equality this direct compare is acceptable in most app contexts.
  return provided === expected;
}

function sanitizePath(path: string): string | null {
  if (!path) return null;
  const trimmed = path.trim();

  // Must be an internal absolute app path.
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;

  // Prevent attempts to pass full URL or traversal-like patterns.
  if (trimmed.includes("://")) return null;
  if (trimmed.includes("..")) return null;

  return trimmed;
}

function sanitizeTags(tags?: string[] | null): string[] {
  if (!Array.isArray(tags)) return [];
  return uniqueTags(
    tags
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean)
      // Keep tags bounded and plain
      .filter((t) => t.length <= 128),
  );
}

function sanitizePaths(paths?: string[] | null): string[] {
  if (!Array.isArray(paths)) return [];
  const clean = paths
    .map((p) => (typeof p === "string" ? sanitizePath(p) : null))
    .filter((p): p is string => Boolean(p));
  return [...new Set(clean)];
}

function applyRevalidation(input: { tags?: string[]; paths?: string[] }) {
  const appliedTags: string[] = [];
  const appliedPaths: string[] = [];

  for (const tag of sanitizeTags(input.tags)) {
    revalidateTag(tag, "max");
    appliedTags.push(tag);
  }

  for (const path of sanitizePaths(input.paths)) {
    revalidatePath(path);
    appliedPaths.push(path);
  }

  return {
    tags: appliedTags,
    paths: appliedPaths,
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let payload: RevalidatePayload;
  try {
    payload = (await req.json()) as RevalidatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  try {
    const now = new Date().toISOString();

    switch (payload.type) {
      case "product": {
        if (!payload.productId) {
          return NextResponse.json(
            { ok: false, error: "productId is required for type=product" },
            { status: 400 },
          );
        }

        const computedTags = getProductInvalidationTags({
          productId: payload.productId,
          category: payload.category ?? null,
          storeId: payload.storeId ?? null,
          sections: payload.sections ?? null,
        });

        const defaultPaths = ["/", `/product/${payload.productId}`];
        if (payload.category) {
          defaultPaths.push("/categories", `/category/${payload.category}`);
        }

        const mergedTags = uniqueTags([
          ...(payload.tags ?? []),
          ...computedTags,
        ]);
        const mergedPaths = [
          ...new Set([...(payload.paths ?? []), ...defaultPaths]),
        ];

        const result = applyRevalidation({
          tags: mergedTags,
          paths: mergedPaths,
        });

        return NextResponse.json({
          ok: true,
          type: payload.type,
          at: now,
          revalidated: result,
        });
      }

      case "category": {
        if (!payload.categorySlug) {
          return NextResponse.json(
            { ok: false, error: "categorySlug is required for type=category" },
            { status: 400 },
          );
        }

        const computedTags = getCategoryInvalidationTags({
          categorySlug: payload.categorySlug,
        });

        const defaultPaths = [
          "/",
          "/categories",
          `/category/${payload.categorySlug}`,
        ];
        const mergedTags = uniqueTags([
          ...(payload.tags ?? []),
          ...computedTags,
        ]);
        const mergedPaths = [
          ...new Set([...(payload.paths ?? []), ...defaultPaths]),
        ];

        const result = applyRevalidation({
          tags: mergedTags,
          paths: mergedPaths,
        });

        return NextResponse.json({
          ok: true,
          type: payload.type,
          at: now,
          revalidated: result,
        });
      }

      case "banners": {
        const computedTags = getBannerInvalidationTags();
        const defaultPaths = ["/", "/deals", "/sale"];
        const mergedTags = uniqueTags([
          ...(payload.tags ?? []),
          ...computedTags,
        ]);
        const mergedPaths = [
          ...new Set([...(payload.paths ?? []), ...defaultPaths]),
        ];

        const result = applyRevalidation({
          tags: mergedTags,
          paths: mergedPaths,
        });

        return NextResponse.json({
          ok: true,
          type: payload.type,
          at: now,
          revalidated: result,
        });
      }

      case "path": {
        const result = applyRevalidation({
          paths: payload.paths,
          tags: payload.tags ?? [],
        });

        if (result.paths.length === 0 && result.tags.length === 0) {
          return NextResponse.json(
            { ok: false, error: "No valid paths/tags to revalidate" },
            { status: 400 },
          );
        }

        return NextResponse.json({
          ok: true,
          type: payload.type,
          at: now,
          revalidated: result,
        });
      }

      case "tag": {
        const result = applyRevalidation({
          tags: payload.tags,
          paths: payload.paths ?? [],
        });

        if (result.paths.length === 0 && result.tags.length === 0) {
          return NextResponse.json(
            { ok: false, error: "No valid tags/paths to revalidate" },
            { status: 400 },
          );
        }

        return NextResponse.json({
          ok: true,
          type: payload.type,
          at: now,
          revalidated: result,
        });
      }

      case "bulk": {
        // Explicit broad invalidation helper
        const defaultTags = [
          CacheTags.allProducts,
          CacheTags.allCategories,
          CacheTags.allBanners,
          CacheTags.listing("home"),
        ];
        const defaultPaths = ["/", "/categories", "/deals", "/sale"];

        const mergedTags = uniqueTags([
          ...(payload.tags ?? []),
          ...defaultTags,
        ]);
        const mergedPaths = [
          ...new Set([...(payload.paths ?? []), ...defaultPaths]),
        ];

        const result = applyRevalidation({
          tags: mergedTags,
          paths: mergedPaths,
        });

        return NextResponse.json({
          ok: true,
          type: payload.type,
          at: now,
          revalidated: result,
        });
      }

      default:
        return NextResponse.json(
          { ok: false, error: "Unsupported revalidation type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[revalidate-webhook] failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to revalidate cache" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Revalidation endpoint is healthy. Use POST with a JSON payload to trigger on-demand ISR.",
    requiredEnv: {
      REVALIDATION_SECRET: Boolean(process.env.REVALIDATION_SECRET),
    },
    examples: [
      {
        type: "product",
        productId: "670000000000000000000000",
        category: "electronics",
      },
      {
        type: "category",
        categorySlug: "electronics",
      },
      {
        type: "banners",
      },
      {
        type: "path",
        paths: ["/", "/categories"],
      },
      {
        type: "tag",
        tags: ["products:all"],
      },
    ],
  });
}
