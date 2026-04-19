import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import ProductDetailClient from "@/components/ProductDetailClient";
import { CacheTags } from "@/lib/cache-tags";
import { ObjectId } from "mongodb";

// 24h ISR safety net (fallback in case on-demand revalidation is missed)
export const revalidate = 86400;

type ProductResponse = {
  _id: string | ObjectId;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image?: string | null;
  images?: string[];
  category?: string;
  stockStatus?: "in-stock" | "pre-order" | string;
  inventory?: number;
  brand?: string;
  model?: string;
  paymentMethods?: string[];
  sections?: string[];
  attributes?: Record<string, string>;
  options?: any[];
  variants?: any[];
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  wholesale?: boolean;
  featured?: boolean;
  isCargo?: boolean;
  deliveryFee?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  rating?: number;
};

/** Load product from MongoDB on the server (avoids self-fetch via BASE_URL, which breaks on many hosts if env is wrong). */
async function fetchProductFromDb(id: string): Promise<ProductResponse | null> {
  const { getCollection } = await import("@/lib/mongodb");
  let objectId: InstanceType<typeof ObjectId>;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const products = await getCollection("products");
  const product = await products.findOne({ _id: objectId } as any);
  if (!product) return null;
  return product as unknown as ProductResponse;
}

function getProductById(id: string): Promise<ProductResponse | null> {
  return unstable_cache(
    () => fetchProductFromDb(id),
    ["product-detail", id],
    {
      revalidate: 86400,
      tags: [CacheTags.allProducts, CacheTags.product(id)],
    },
  )();
}

async function fetchRelatedProductsFromDb(
  category: string,
  currentProductId: string,
) {
  const { getCollection } = await import("@/lib/mongodb");
  const products = await getCollection("products");
  const results = await products
    .find(
      { category, _id: { $ne: new ObjectId(currentProductId) } },
      {
        projection: {
          name: 1,
          price: 1,
          image: 1,
          images: 1,
          category: 1,
          featured: 1,
          rating: 1,
          stockStatus: 1,
          isCargo: 1,
          inventory: 1,
        },
      },
    )
    .sort({ _id: -1 })
    .limit(4)
    .toArray();

  return results.map((p) => ({
    id: String(p._id),
    name: p.name,
    image: p.image || "",
    price: p.price,
    rating: p.rating || 0,
    category: p.category,
    featured: p.featured,
    stockStatus: p.stockStatus,
    isCargo: p.isCargo || false,
    inventory: p.inventory,
  }));
}

function getRelatedProducts(
  category: string | undefined,
  currentProductId: string,
) {
  if (!category) return Promise.resolve([]);

  return unstable_cache(
    () => fetchRelatedProductsFromDb(category, currentProductId),
    ["related-products", category, currentProductId],
    {
      revalidate: 86400,
      tags: [CacheTags.allProducts, CacheTags.productsByCategory(category)],
    },
  )();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<import("next").Metadata> {
  const { id } = await params;

  if (!ObjectId.isValid(id)) return {};

  try {
    const product = await getProductById(id);
    if (!product) return {};

    const title = product.isCargo ? `${product.name} + Карго` : product.name;
    const description = product.description || product.name;
    const images = product.images?.[0]
      ? [{ url: product.images[0] }]
      : product.image
        ? [{ url: product.image }]
        : [];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images,
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    notFound();
  }

  try {
    const product = await getProductById(id);

    if (!product) {
      notFound();
    }

    const relatedProducts = await getRelatedProducts(product.category, id);

    const productData = {
      id: String(product._id),
      name: product.name,
      description: product.description ?? null,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      image: product.image || null,
      images: product.images || [],
      category: product.category || "",
      stockStatus: product.stockStatus || "in-stock",
      inventory: product.inventory ?? 0,
      brand: product.brand || undefined,
      model: product.model || undefined,
      paymentMethods: Array.isArray(product.paymentMethods)
        ? product.paymentMethods.join(", ")
        : product.paymentMethods || undefined,
      sections: product.sections || [],
      attributes: product.attributes || {},
      options: product.options || [],
      variants: product.variants || [],
      shippingOrigin: product.shippingOrigin || undefined,
      shippingDestination: product.shippingDestination || undefined,
      dispatchTime: product.dispatchTime || undefined,
      sizeGuideUrl: product.sizeGuideUrl || undefined,
      wholesale: product.wholesale || false,
      featured: product.featured || false,
      isCargo: product.isCargo || false,
      deliveryFee: product.deliveryFee ?? 0,
      createdAt: product.createdAt
        ? new Date(product.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: product.updatedAt
        ? new Date(product.updatedAt).toISOString()
        : new Date().toISOString(),
      rating: product.rating || 0,
      relatedProducts,
    };

    return <ProductDetailClient product={productData} initialReviews={[]} />;
  } catch {
    notFound();
  }
}
