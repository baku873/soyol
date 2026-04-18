export interface OrderFormData {
  fullName: string;
  phone: string;
  label?: string; // e.g. "Home", "Work"
  address: string;
  city: string;
  district: string;
  khoroo?: string;
  street?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  door?: string;
  notes?: string;
}

/** Valid order status values */
export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

/** Statuses from which an order can still be cancelled */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = ['pending', 'confirmed'] as const;

export interface Order extends OrderFormData {
  id: string;
  items: {
    id: string;
    productId?: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    variantId?: string;
    selectedOptions?: Record<string, string>;
  }[];
  totalPrice: number;
  total?: number; // fallback
  createdAt: string | Date;
  status: OrderStatus;
  cancelledAt?: string | Date | null;
  deliveryEstimate?: string; // e.g. "2 weeks", "2-5 days"
}
