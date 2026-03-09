'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Search, ShoppingCart, Eye, Sparkles, TrendingUp,
  Zap, Tag, Globe, Truck, LayoutGrid, Award, Flame,
  Camera, Mic, ChevronRight, Clock, Star, X,
  Phone, Laptop, Watch, Headphones, Gamepad, Heart, Gift, MoreHorizontal
} from 'lucide-react';
import { formatPrice, getStarRating } from '@lib/utils';
import { useCartStore } from '@store/cartStore';
import toast from 'react-hot-toast';
import DiscoveryProductCard from '@/components/DiscoveryProductCard';
import { useTranslation } from '@/hooks/useTranslation';

interface ProductItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  category: string;
  rating?: number;
  wholesale?: boolean;
  stockStatus?: 'in-stock' | 'pre-order';
}

function SearchContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = searchParams.get('q') ?? '';
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [recommended, setRecommended] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const saved = localStorage.getItem('soyol-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    // Fetch categories for discovery
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || (Array.isArray(data) ? data : [])))
      .catch(() => { });

    // Fetch recommended products for discovery
    fetch('/api/products?limit=8')
      .then(res => res.json())
      .then(data => setRecommended(data.products || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Update recent searches
    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(s => s !== q)].slice(0, 5);
      localStorage.setItem('soyol-recent-searches', JSON.stringify(updated));
      return updated;
    });

    fetch(`/api/products?q=${encodeURIComponent(q)}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, [q]);

  const handleAddToCart = (product: any) => {
    addItem(product);
    toast.success(`${product.name} сагсанд нэмэгдлээ!`, {
      duration: 2000,
      position: 'top-right',
      style: {
        background: '#FF7900',
        color: 'white',
        fontWeight: 'bold',
        borderRadius: '12px',
      },
      icon: '🛒',
    });
  };

  const trendingTags = [
    { text: 'iPhone 15 Pro', status: 'HOT' },
    { text: 'AirPods Max', status: 'NEW' },
    { text: 'Gaming Setup', status: 'HOT' },
    { text: 'Skin Care', status: 'TREND' },
    { text: 'Winter Sale', status: 'HOT' },
  ];

  // The unused legacy static categories list has been removed

  if (!q.trim()) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-24">
        {/* Luxury Search Header for Mobile */}
        <div className="lg:hidden bg-white px-4 pt-6 pb-4 rounded-b-[40px] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{t('nav', 'search')}</h2>
            <div className="flex gap-3">
              <Camera className="w-5 h-5 text-gray-400" />
              <Mic className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Trending Horizontal Scroll */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
            <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-gray-700">Эрэлттэй</span>
            </div>
            {trendingTags.map((tag, idx) => (
              <div key={idx} className="flex items-center gap-2 shrink-0 bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-100/50 shadow-sm transition-all active:scale-95">
                <span className="text-xs font-medium text-gray-600">{tag.text}</span>
                {tag.status === 'HOT' && <Flame className="w-3 h-3 text-red-500 fill-red-500" />}
                {tag.status === 'NEW' && <Sparkles className="w-3 h-3 text-blue-500 fill-blue-500" />}
              </div>
            ))}
          </div>
        </div>

        {/* Discovery Sections */}
        <div className="px-4 mt-8 space-y-10">

          {/* Dynamic Categories Grid from Database */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-gray-900">{t('nav', 'allCategories')}</h3>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            {categories.length > 0 ? (
              <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                {categories.map((cat, idx) => (
                  <Link key={cat.id || idx} href={`/?category=${cat.id || cat._id}`}>
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-3 cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-[20px] bg-white border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex items-center justify-center text-gray-800 transition-all duration-300 hover:shadow-md hover:border-gray-200 hover:-translate-y-1">
                        <span className="text-2xl">{cat.icon || '📦'}</span>
                      </div>
                      <span className="text-[11px] font-normal text-gray-600 tracking-wide text-center leading-tight max-w-full truncate px-1">
                        {cat.name}
                      </span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-[20px] bg-gray-100 animate-pulse border border-gray-50" />
                    <div className="w-12 h-2 bg-gray-100 animate-pulse rounded-full mt-1" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Section (Temu Style Masonry) */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-orange-500 rounded-full" />
              <h3 className="text-lg font-black text-gray-900">Танд санал болгох</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 p-2">
              {recommended.map((product, index) => (
                <DiscoveryProductCard
                  key={product.id}
                  product={product as any}
                  index={index}
                  showTrendingBadge={index < 2}
                />
              ))}

              {/* If no recommendations, show some placeholders or skeletons */}
              {recommended.length === 0 && Array(4).fill(0).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-3xl animate-pulse" />
              ))}
            </div>

            <button className="w-full mt-8 py-4 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm shadow-sm active:scale-95 transition-all">
              Илүүг үзэх
            </button>
          </section>

          {/* Search History / Recent */}
          <section className="bg-white/50 backdrop-blur-sm p-6 rounded-[32px] border border-white shadow-sm">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" /> Сүүлд хайсан
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((h, i) => (
                <Link key={i} href={`/search?q=${encodeURIComponent(h)}`}>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100/50 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer hover:bg-gray-200">
                    {h}
                  </span>
                </Link>
              ))}
              {recentSearches.length === 0 && (
                <span className="text-xs text-gray-300 italic">Түүх байхгүй</span>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen border-t border-gray-50 bg-white py-12 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-[#FF5000] mx-auto mb-4"
          />
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{t('product', 'loading') || 'Searching...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-4 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter">
              &quot;{q}&quot;
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              {products.length === 0
                ? 'Үр дүн олдсонгүй'
                : `${products.length} бараа олдлоо`}
            </p>
          </div>
          <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <LayoutGrid className="w-5 h-5 text-gray-400" />
          </div>
        </motion.div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[40px] shadow-sm border border-gray-100 px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-200" strokeWidth={1} />
            </div>
            <p className="text-gray-800 font-black text-xl mb-2">Үр дүн олдсонгүй</p>
            <p className="text-gray-400 text-sm max-w-[200px] mx-auto mb-8">Өөр үгээр дахин хайж үзнэ үү</p>
            <Link
              href="/"
              className="inline-block px-10 py-4 bg-[#FF5000] text-white font-black rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition-all text-sm uppercase tracking-wider"
            >
              Буцах
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
            {products.map((product, index) => (
              <DiscoveryProductCard
                key={product.id}
                product={product as any}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7900]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
