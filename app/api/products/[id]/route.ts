import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { CacheTags, getProductInvalidationTags } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";
// Safety-net fallback: 24 hours
export const revalidate = 86400;

type ProductDoc = {
  _id: any;
  category?: string;
  storeId?: string;
  sections?: string[];
  [key: string]: any;
};

function mapProductResponse(product: any) {
  return {
    ...product,
    id: product?._id?.toString?.() ?? String(product?._id ?? ""),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 },
      );
    }

    const { getCollection } = await import("@/lib/mongodb");
    const { ObjectId } = await import("mongodb");

    let objectId: InstanceType<typeof ObjectId>;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid Product ID" },
        { status: 400 },
      );
    }

    const products = await getCollection<ProductDoc>("products");
    const product = await products.findOne({ _id: objectId } as any);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const response = NextResponse.json(mapProductResponse(product));

    // Data Cache tags for this resource (readable by upstream caches / debugging).
    // Note: actual Next Data Cache tagging is done by fetch(..., { next: { tags: [...] } })
    // in server components/routes consuming this endpoint.
    response.headers.set(
      "x-next-cache-tags",
      [CacheTags.allProducts, CacheTags.product(id)].join(","),
    );

    // CDN/browser cache safety profile. Keep short/controlled while server-side fetch
    // with tags + revalidate handles persistent ISR behavior.
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return response;
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const { getCollection } = await import("@/lib/mongodb");
    const { ObjectId } = await import("mongodb");

    let objectId: InstanceType<typeof ObjectId>;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid Product ID" },
        { status: 400 },
      );
    }

    const products = await getCollection<ProductDoc>("products");

    // Load existing product first so we can invalidate old category/store/section tags too.
    const existing = await products.findOne({ _id: objectId } as any);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      "featured",
      "stockStatus",
      "inventory",
      "name",
      "description",
      "price",
      "originalPrice",
      "discountPercent",
      "category",
      "image",
      "images",
      "brand",
      "model",
      "delivery",
      "paymentMethods",
      "sections",
      "attributes",
      "wholesale",
      "options",
      "variants",
      "isCargo",
      "deliveryFee",
      "storeId",
    ] as const;

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    updateData.updatedAt = new Date();

    const result = await products.updateOne({ _id: objectId } as any, {
      $set: updateData,
    });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Build invalidation tags from BEFORE + AFTER snapshots to prevent stale category/store pages.
    const nextCategory = updateData.category ?? existing.category ?? null;
    const nextStoreId = updateData.storeId ?? existing.storeId ?? null;
    const nextSections = updateData.sections ?? existing.sections ?? null;

    const beforeTags = getProductInvalidationTags({
      productId: id,
      category: existing.category ?? null,
      storeId: existing.storeId ?? null,
      sections: existing.sections ?? null,
    });

    const afterTags = getProductInvalidationTags({
      productId: id,
      category: nextCategory,
      storeId: nextStoreId,
      sections: nextSections,
    });

    const allTags = Array.from(new Set([...beforeTags, ...afterTags]));

    for (const tag of allTags) {
      revalidateTag(tag, "max");
    }

    // Path-based invalidation for key routes that render this product
    revalidatePath(`/product/${id}`);
    revalidatePath("/");
    revalidatePath("/categories");
    if (existing.category) revalidatePath(`/category/${existing.category}`);
    if (nextCategory && nextCategory !== existing.category) {
      revalidatePath(`/category/${nextCategory}`);
    }

    // Optional admin surface refreshes
    revalidatePath("/admin/products");

    return NextResponse.json({
      success: true,
      updated: updateData,
      revalidated: {
        tags: allTags,
        paths: [
          `/product/${id}`,
          "/",
          "/categories",
          existing.category ? `/category/${existing.category}` : null,
          nextCategory && nextCategory !== existing.category
            ? `/category/${nextCategory}`
            : null,
          "/admin/products",
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}
