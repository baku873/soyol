import { notFound } from "next/navigation";
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

function getBaseUrl() {
  const normalize = (v?: string) => (v || "").trim().replace(/\/+$/, "");
  const envCandidates = [
    normalize(process.env.NEXT_PUBLIC_BASE_URL),
    normalize(process.env.NEXTAUTH_URL),
    process.env.VERCEL_URL
      ? `https://${normalize(process.env.VERCEL_URL)}`
      : "",
  ].filter(Boolean);

  return envCandidates[0] || "http://localhost:3000";
}

async function getProductById(id: string): Promise<ProductResponse | null> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/products/${id}`, {
    next: {
      // Tag-based cache invalidation target
      tags: [CacheTags.allProducts, CacheTags.product(id)],
      // Safety-net revalidation window (24h)
      revalidate: 86400,
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch product: ${res.status}`);

  return (await res.json()) as ProductResponse;
}

async function getRelatedProducts(
  category: string | undefined,
  currentProductId: string,
) {
  if (!category) return [];

  const baseUrl = getBaseUrl();
  const params = new URLSearchParams({
    category,
    limit: "8",
  });

  const res = await fetch(`${baseUrl}/api/products?${params.toString()}`, {
    next: {
      tags: [CacheTags.allProducts, CacheTags.productsByCategory(category)],
      revalidate: 86400,
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { products?: any[] };
  const products = Array.isArray(data?.products) ? data.products : [];

  return products
    .filter((p) => String(p?._id || p?.id) !== currentProductId)
    .slice(0, 4)
    .map((p) => ({
      id: String(p._id || p.id),
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
