import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

// Note: removed `export const dynamic = "force-dynamic"` so Next.js Data Cache
// can cache per-URL for `revalidate` seconds. Combined with the s-maxage
// CDN header below, this cuts Mongo query volume dramatically.
export const revalidate = 60;

// Projection for list views — omit heavy fields (variants, options, full
// description, attributes). Detail route fetches the full document separately.
const LIST_PROJECTION = {
  name: 1,
  price: 1,
  originalPrice: 1,
  discountPercent: 1,
  discount: 1,
  image: 1,
  images: 1,
  category: 1,
  subcategory: 1,
  stockStatus: 1,
  inventory: 1,
  featured: 1,
  sections: 1,
  rating: 1,
  salesCount: 1,
  createdAt: 1,
} as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const q = searchParams.get("q")?.trim();
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const stockStatus = searchParams.get("stockStatus");

    const products = await getCollection("products");
    const filter: Record<string, any> = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    const conditions: object[] = [];

    if (stockStatus) {
      filter.stockStatus = stockStatus;
    }

    const featured = searchParams.get("featured");
    if (featured === "true") {
      filter.featured = true;
    }

    const isSale = searchParams.get("isSale");
    if (isSale === "true") {
      conditions.push({
        $or: [{ discountPercent: { $gt: 0 } }, { discount: { $gt: 0 } }],
      });
    }

    const isNew = searchParams.get("isNew");
    if (isNew === "true") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      conditions.push({
        $or: [
          { createdAt: { $gt: thirtyDaysAgo } },
          { sections: "Шинэ" },
          { sections: "New" },
        ],
      });
    }

    // Full-text search — uses the `products_text_search` index.
    // Replaces the old unanchored $regex which forced a collection scan.
    if (q) {
      filter.$text = { $search: q };
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) (filter.price as any).$gte = parseFloat(minPrice);
      if (maxPrice) (filter.price as any).$lte = parseFloat(maxPrice);
    }

    searchParams.forEach((value, key) => {
      if (key.startsWith("attr_") && value) {
        const attributeId = key.replace("attr_", "");
        filter[`attributes.${attributeId}`] = value;
      }
    });

    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 200);
    const cursor = searchParams.get("cursor");

    let items: any[];
    let hasMore: boolean;
    let nextCursor: string | null = null;

    if (q) {
      // Text search mode — sort by relevance score. Cursor pagination on
      // _id doesn't combine with score sort, so we use offset here.
      // Users rarely paginate search past page 1-2.
      const page = cursor ? parseInt(cursor, 10) || 0 : 0;
      const skip = page * limit;

      const results = await products
        .find(filter, {
          projection: {
            ...LIST_PROJECTION,
            score: { $meta: "textScore" },
          },
        })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit + 1)
        .toArray();

      hasMore = results.length > limit;
      items = hasMore ? results.slice(0, limit) : results;
      nextCursor = hasMore ? String(page + 1) : null;
    } else {
      // Normal browse mode — cursor pagination on _id descending (newest first).
      if (cursor) {
        const { ObjectId } = await import("mongodb");
        filter._id = { $lt: new ObjectId(cursor) };
      }

      const results = await products
        .find(filter, { projection: LIST_PROJECTION })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .toArray();

      hasMore = results.length > limit;
      items = hasMore ? results.slice(0, limit) : results;
      nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;
    }

    const mappedResults = items.map((product) => {
      const { score, ...rest } = product;
      return {
        ...rest,
        id: product._id.toString(),
      };
    });

    const isAdmin = searchParams.get("admin") === "true";
    const headers: Record<string, string> = {
      "Cache-Control": isAdmin
        ? "no-store, max-age=0"
        : "public, s-maxage=60, stale-while-revalidate=120",
    };

    return NextResponse.json(
      { products: mappedResults, nextCursor, hasMore },
      { headers },
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Products API] Error:", err.message);

    return NextResponse.json(
      { products: [], nextCursor: null, hasMore: false },
      { status: 200 },
    );
  }
}
