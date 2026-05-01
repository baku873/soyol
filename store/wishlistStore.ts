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
  syncWithServer: () => Promise<void>;
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

        // Fire-and-forget: sync to server if authenticated
        fetch('/api/user/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        }).catch(() => {});
      },
      
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });

        // Fire-and-forget: sync to server if authenticated
        fetch('/api/user/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        }).catch(() => {});
      },
      
      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId);
      },
      
      clearWishlist: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.length;
      },

      syncWithServer: async () => {
        try {
          const res = await fetch('/api/user/wishlist');
          if (!res.ok) return;
          const data = await res.json();
          const serverItems: Product[] = data.items || [];

          // Merge: union of local + server, no duplicates (server wins for same id)
          const localItems = get().items;
          const merged = new Map<string, Product>();

          // Add local items first
          for (const item of localItems) {
            merged.set(item.id, item);
          }
          // Server items overwrite / add
          for (const item of serverItems) {
            merged.set(item.id, item);
          }

          const mergedItems = Array.from(merged.values());
          set({ items: mergedItems });

          // Push any local-only items to the server
          const serverIds = new Set(serverItems.map((i) => i.id));
          const localOnly = localItems.filter((i) => !serverIds.has(i.id));
          for (const item of localOnly) {
            fetch('/api/user/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: item.id }),
            }).catch(() => {});
          }
        } catch {
          // Silently fail — localStorage still works for guests
        }
      },
    }),
    {
      name: 'soyol-wishlist-storage',
    }
  )
);
