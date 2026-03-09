'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SavedItemsPage() {
  const { items, removeItem } = useWishlistStore();
  const { addItem } = useCartStore();

  const handleAddToCart = (item: any) => {
    addItem({ ...item, stockStatus: 'in-stock' });
    toast.success('Сагсанд нэмлээ');
  };

  const handleRemove = (id: string) => {
    removeItem(id);
    toast.success('Хүслээс хассан');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans pb-24">
      {/* Header */}
      <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
        <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
          <ChevronLeft className="w-6 h-6" strokeWidth={2} />
        </Link>
        <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
          Хадгалсан бараа
        </h1>
        {items.length > 0 && (
          <span className="text-[13px] font-bold text-[#FF6B00]">{items.length} бараа</span>
        )}
      </div>

      <div className="p-4">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col"
              >
                <Link href={`/product/${item.id}`} className="relative aspect-square bg-gray-50 block">
                  <Image
                    src={item.image || '/placeholder-product.png'}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); handleRemove(item.id); }}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 backdrop-blur-md rounded-full text-[#FF6B00] active:scale-90 transition-transform"
                  >
                    <Heart className="w-4 h-4 fill-[#FF6B00]" strokeWidth={2} />
                  </button>
                </Link>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-[13px] font-bold text-[#1A1A1A] line-clamp-2 leading-snug mb-2 flex-1">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-black text-[#FF6B00]">
                      {formatPrice(item.price)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                    >
                      <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center px-4">
            <div className="w-[100px] h-[100px] rounded-full bg-white shadow-sm flex items-center justify-center mb-6 relative">
              <Heart className="w-12 h-12 text-[#FF6B00]" strokeWidth={1.5} />
              <div className="absolute -bottom-2 -right-2 bg-orange-100 rounded-full w-8 h-8 flex items-center justify-center border-2 border-white">
                <span className="text-orange-500 font-bold text-xs">0</span>
              </div>
            </div>
            <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">Хадгалсан бараа байхгүй байна</h3>
            <p className="text-[14px] text-[#999999] mb-8">Таалагдсан барааныхаа зүрхэн дээр дарж энд хадгалаарай.</p>
            <Link href="/" className="px-8 py-3.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white text-[15px] font-bold rounded-xl shadow-[0_4px_12px_rgba(255,107,0,0.3)] active:opacity-90 transition-opacity">
              Дэлгүүр хэсэх
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
