import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 60;

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

    if (q) {
      conditions.push({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { brand: { $regex: q, $options: "i" } },
        ],
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) (filter.price as any).$gte = parseFloat(minPrice);
      if (maxPrice) (filter.price as any).$lte = parseFloat(maxPrice);
    }

    // Dynamic Attribute Filtering
    searchParams.forEach((value, key) => {
      if (key.startsWith("attr_") && value) {
        const attributeId = key.replace("attr_", "");
        filter[`attributes.${attributeId}`] = value;
      }
    });

    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 200);
    const cursor = searchParams.get("cursor");

    if (cursor) {
      // For cursor-based pagination with descending createdAt, we need a stable sort
      // If we use _id as cursor, we assume sorting by _id (which is roughly by time)
      const { ObjectId } = await import("mongodb");
      filter._id = { $lt: new ObjectId(cursor) };
    }

    const cursorQuery = products.find(filter).sort({ _id: -1 });

    if (q) {
      // With regex search, sorting by default (_id: -1) which handles the latest
      (cursorQuery as any).sort({ _id: -1 });
    }

    const results = await cursorQuery.limit(limit + 1).toArray();

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    const mappedResults = items.map((product) => ({
      ...product,
      id: product._id.toString(),
    }));

    // Cache Control Logic
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
