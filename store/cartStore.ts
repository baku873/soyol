import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Product } from "@/types/Product";

export interface CartItem extends Product {
  cartItemId: string; // Unique identifier for the cart item (productId or productId-variantId)
  quantity: number;
  selected: boolean; // New: flag for Taobao-style selection
  isReady?: boolean; // New: flag for stock availability
  variantId?: string;
  selectedOptions?: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'cartItemId' | 'selected' | 'isReady' | 'quantity'>, quantity?: number, replace?: boolean) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  toggleItemSelection: (cartItemId: string) => void; // New
  toggleAllSelection: (selected: boolean) => void; // New
  clearCart: () => void;
  getTotalItems: () => number;
  getSelectedTotalItems: () => number; // New
  getTotalPrice: () => number;
  getSelectedTotalPrice: () => number; // New
  getSelectedTotalItemsByStatus: (status: 'in-stock' | 'pre-order') => number; // New
  getSelectedTotalPriceByStatus: (status: 'in-stock' | 'pre-order') => number; // New
  setAuthenticated: (isAuth: boolean) => void;
}

/**
 * Custom storage that switches between localStorage (logged-in) and sessionStorage (guest).
 * Guests lose their cart on tab close / refresh.
 * Logged-in users keep their cart across sessions.
 */
let currentStorage: Storage | undefined =
  typeof window !== 'undefined' ? sessionStorage : undefined;

const adaptiveStorage: StateStorage = {
  getItem: (name) => currentStorage?.getItem(name) ?? null,
  // StateStorage interface expects void | Promise<void> for setItem, so we don't return the value here.
  setItem: (name, value) => {
    currentStorage?.setItem(name, value);
  },
  removeItem: (name) => currentStorage?.removeItem(name),
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (product, quantity = 1, replace = false) => {
        const items = get().items;
        const cartItemId = product.variantId ? `${product.id}-${product.variantId}` : product.id;
        
        const existingItem = items.find((item) => item.cartItemId === cartItemId);
        let newItems;

        if (existingItem) {
          newItems = items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: replace ? quantity : item.quantity + quantity, selected: true }
              : item
          );
        } else {
          newItems = [
            ...items,
            {
              ...product,
              cartItemId,
              quantity,
              selected: true,
              isReady: (product.stockStatus || 'in-stock') === 'in-stock'
            } as CartItem
          ];
        }

        set({ items: newItems });

        // Sync with API if authenticated
        // Returning void to match the TypeScript signature `addItem: (product: Product) => void`
        // without awaiting the promise returned by the async function internally.
        if (currentStorage === localStorage) {
          try {
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: newItems }),
            });
          } catch (e) {
            console.error('Failed to sync cart with API:', e);
          }
        }
      },

      removeItem: async (cartItemId) => {
        const newItems = get().items.filter((item) => item.cartItemId !== cartItemId);
        set({ items: newItems });

        if (currentStorage === localStorage) {
          try {
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: newItems }),
            });
          } catch (e) {
            console.error('Failed to sync removed item with API:', e);
          }
        }
      },

      updateQuantity: async (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        const newItems = get().items.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity } : item
        );
        set({ items: newItems });

        if (currentStorage === localStorage) {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: newItems }),
          });
        }
      },

      toggleItemSelection: (cartItemId) => {
        set({
          items: get().items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, selected: !item.selected } : item
          ),
        });
      },

      toggleAllSelection: (selected) => {
        set({
          items: get().items.map((item) => ({ ...item, selected })),
        });
      },

      clearCart: async () => {
        set({ items: [] });
        if (currentStorage === localStorage) {
          await fetch('/api/cart', { method: 'DELETE' });
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSelectedTotalItems: () => {
        return get().items
          .filter(item => item.selected)
          .reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getSelectedTotalPrice: () => {
        return get().items
          .filter(item => item.selected)
          .reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getSelectedTotalItemsByStatus: (status) => {
        return get().items
          .filter(item => item.selected && (item.stockStatus || 'in-stock') === status)
          .reduce((total, item) => total + item.quantity, 0);
      },

      getSelectedTotalPriceByStatus: (status) => {
        return get().items
          .filter(item => item.selected && (item.stockStatus || 'in-stock') === status)
          .reduce((total, item) => total + item.price * item.quantity, 0);
      },

      setAuthenticated: async (isAuth: boolean) => {
        if (typeof window === 'undefined') return;

        // Note: This key matches the zustand persist `name` property below.
        // It's used to manually clear the storage when logging in/out to prevent data leaks or duplication.
        const key = 'soyol-cart-storage';

        if (isAuth) {
          const guestItems = get().items;
          currentStorage = localStorage;

          // Fetch DB items
          let dbItems: CartItem[] = [];
          try {
            const res = await fetch('/api/cart');
            if (res.ok) {
              const data = await res.json();
              dbItems = data.items || [];
            }
          } catch (e) {
            console.error('Failed to fetch DB cart:', e);
          }

          // Merge logic
          const mergedMap = new Map<string, CartItem>();

          // Start with DB items
          dbItems.forEach(item => {
            const id = item.cartItemId || (item.variantId ? `${item.id}-${item.variantId}` : item.id);
            mergedMap.set(id, { ...item, cartItemId: id });
          });

          // Merge guest items
          guestItems.forEach(item => {
            const id = item.cartItemId || (item.variantId ? `${item.id}-${item.variantId}` : item.id);
            if (mergedMap.has(id)) {
              const existing = mergedMap.get(id)!;
              mergedMap.set(id, {
                ...item,
                cartItemId: id,
                quantity: existing.quantity + item.quantity
              });
            } else {
              mergedMap.set(id, { ...item, cartItemId: id });
            }
          });

          const finalItems = Array.from(mergedMap.values());
          set({ items: finalItems });

          // Push merged cart back to DB
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: finalItems }),
          });

          sessionStorage.removeItem(key);
        } else {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          currentStorage = sessionStorage;
          set({ items: [] });
        }
      },
    }),
    {
      name: 'soyol-cart-storage',
      storage: createJSONStorage(() => adaptiveStorage),
    }
  )
);
