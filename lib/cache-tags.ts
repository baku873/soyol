/**
 * Centralized cache tag utilities for Next.js App Router On-Demand ISR.
 *
 * Usage:
 * - In fetch calls: next: { tags: [CacheTags.allProducts, CacheTags.product(id)] }
 * - In webhook/admin handlers: revalidateTag(CacheTags.product(id))
 */

export const CacheTags = {
  // Global collections
  allProducts: "products:all",
  allCategories: "categories:all",
  allBanners: "banners:all",
  allStores: "stores:all",
  allReviews: "reviews:all",

  // Product-related
  product: (id: string) => `product:${id}`,
  productReviews: (productId: string) => `product:${productId}:reviews`,
  productsByCategory: (categorySlug: string) =>
    `products:category:${normalizeSlug(categorySlug)}`,
  productsByStore: (storeId: string) => `products:store:${storeId}`,
  productsBySection: (section: string) =>
    `products:section:${normalizeSlug(section)}`,

  // Category-related
  category: (categorySlug: string) =>
    `category:${normalizeSlug(categorySlug)}`,

  // Banner-related
  banner: (id: string) => `banner:${id}`,

  // Store-related
  store: (id: string) => `store:${id}`,

  // Search / list scopes
  searchQuery: (query: string) => `search:${normalizeSlug(query)}`,
  listing: (name: string) => `listing:${normalizeSlug(name)}`,
} as const;

export type CacheTagValue = string;

/**
 * Normalizes slugs/keys used in tag generation.
 */
function normalizeSlug(value: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

/**
 * Tags to invalidate when a single product is changed.
 * Useful after create/update/delete actions.
 */
export function getProductInvalidationTags(input: {
  productId: string;
  category?: string | null;
  storeId?: string | null;
  sections?: string[] | null;
}): CacheTagValue[] {
  const { productId, category, storeId, sections } = input;

  const tags: CacheTagValue[] = [
    CacheTags.allProducts,
    CacheTags.product(productId),
    CacheTags.productReviews(productId),
    CacheTags.listing("home"),
    CacheTags.listing("new-arrivals"),
    CacheTags.listing("sale"),
    CacheTags.listing("ready-to-ship"),
    CacheTags.searchQuery("all"),
  ];

  if (category) {
    tags.push(CacheTags.productsByCategory(category));
    tags.push(CacheTags.category(category));
  }

  if (storeId) {
    tags.push(CacheTags.productsByStore(storeId));
    tags.push(CacheTags.store(storeId));
  }

  if (sections?.length) {
    for (const section of sections) {
      tags.push(CacheTags.productsBySection(section));
    }
  }

  return uniqueTags(tags);
}

/**
 * Tags to invalidate when a category is changed.
 */
export function getCategoryInvalidationTags(input: {
  categorySlug: string;
}): CacheTagValue[] {
  const tags: CacheTagValue[] = [
    CacheTags.allCategories,
    CacheTags.category(input.categorySlug),
    CacheTags.productsByCategory(input.categorySlug),
    CacheTags.allProducts,
    CacheTags.listing("home"),
  ];

  return uniqueTags(tags);
}

/**
 * Tags to invalidate when banners are changed.
 */
export function getBannerInvalidationTags(): CacheTagValue[] {
  return uniqueTags([
    CacheTags.allBanners,
    CacheTags.listing("home"),
    CacheTags.listing("deals"),
    CacheTags.listing("sale"),
  ]);
}

/**
 * Helper for deduplicating tags.
 */
export function uniqueTags(tags: readonly string[]): string[] {
  return [...new Set(tags.filter(Boolean))];
}
