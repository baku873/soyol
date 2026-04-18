export type StockStatus = 'in-stock' | 'pre-order';

export interface ProductOption {
  id: string;
  name: string; // e.g., 'Өнгө' (Color)
  values: string[]; // e.g., ['Улаан', 'Хар']
  subcategory?: string;
}

export interface ProductVariant {
  id: string;
  options: Record<string, string>; // e.g., { 'Өнгө': 'Улаан', 'Хэмжээ': 'S' }
  inventory: number;
  price?: number; // Override price for this specific variant
  image?: string; // Optional variant-specific image
}

export interface Product {
  id: string;
  name: string;
  image?: string | null;
  images?: string[];
  price: number; // Final price after discount
  originalPrice?: number; // Base price before discount
  discountPercent?: number; // 0-100
  discount?: number;
  description?: string;
  category: string;
  subcategory?: string;
  featured?: boolean;
  wholesale?: boolean;
  stockStatus: string;
  inventory?: number;
  salesCount?: number;
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  sections?: string[]; // ['Шинэ', 'Бэлэн', etc.]
  deliveryFee?: number;
  attributes?: Record<string, string>;
  options?: ProductOption[];
  variants?: ProductVariant[];
  isCargo?: boolean;
  rating?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
