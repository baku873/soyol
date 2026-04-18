import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from "@/types/Product";

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === product.id);
        
        if (!existingItem) {
          set({ items: [...items, product] });
        }
      },
      
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },
      
      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId);
      },
      
      clearWishlist: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.length;
      },
    }),
    {
      name: 'soyol-wishlist-storage',
    }
  )
);
