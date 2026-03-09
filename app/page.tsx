'use client';

import Link from 'next/link';
import { Sparkles, Package, Clock, ArrowUpDown, SlidersHorizontal, X, Tag } from 'lucide-react';
import FeatureSection from '@/components/FeatureSection';
import PremiumProductGrid from '@/components/PremiumProductGrid';
import BannerSlider from '@/components/BannerSlider';
import SpecialProductsCarousel from '@/components/SpecialProductsCarousel';
import MobileFeaturedCarousel from '@/components/MobileFeaturedCarousel';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useProducts } from '@/lib/hooks/useProducts';
import { type Product } from '@/models/Product';
import MobileHero from '@/components/MobileHero';
import MobileProductGrid from '@/components/MobileProductGrid';
import InfiniteScrollTrigger from '@/components/InfiniteScrollTrigger';

type FilterType = 'all' | 'Бэлэн' | 'Захиалга' | 'Шинэ' | 'Хямдрал' | string;
type SortType = 'newest' | 'price-low' | 'price-high' | 'name-az';

export default function HomePage() {
  const { currency, convertPrice } = useLanguage();
  const { t } = useTranslation();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { products: allProducts, isLoading: loading, isLoadingMore, isReachingEnd, size, setSize, error } = useProducts();

  const [sortBy, setSortBy] = useState<SortType>('name-az');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Apply active tab filter
  let filteredProducts: Product[];

  if (activeFilter === 'all') {
    // Бүгд — бүх бараа
    filteredProducts = [...allProducts];
  } else if (activeFilter === 'Бэлэн') {
    // Бэлэн бараа — stockStatus === 'in-stock' (эсвэл тодорхойгүй бол default нь in-stock)
    filteredProducts = allProducts.filter((p: Product) =>
      !p.stockStatus || p.stockStatus === 'in-stock'
    );
  } else if (activeFilter === 'Захиалга') {
    // Захиалгаар — stockStatus === 'pre-order'
    filteredProducts = allProducts.filter((p: Product) =>
      p.stockStatus === 'pre-order'
    );
  } else if (activeFilter === 'Шинэ') {
    // Шинэ бараа — sections-д 'Шинэ' агуулсан эсвэл сүүлийн 30 хоногт нэмэгдсэн
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    filteredProducts = allProducts.filter((p: Product) =>
      p.sections?.includes('Шинэ') ||
      (p.createdAt && new Date(p.createdAt) > thirtyDaysAgo)
    );
  } else if (activeFilter === 'Хямдрал') {
    // Хямдрал — originalPrice байгаа болон price < originalPrice
    filteredProducts = allProducts.filter((p: Product) =>
      p.originalPrice && p.originalPrice > p.price
    );
  } else {
    // Бусад section-based filter (Онцлох гэх мэт)
    filteredProducts = allProducts.filter((p: Product) =>
      p.sections?.includes(activeFilter)
    );
  }

  // Apply price filter
  const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
  const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;

  if (minPrice || maxPrice) {
    filteredProducts = filteredProducts.filter(p =>
      p.price >= minPriceNum && p.price <= maxPriceNum
    );
  }

  // Sort by selected option (newest, price, name). Same list for all/ready/preorder tabs.
  let sortedProducts: Product[];
  const sortFunction = (a: Product, b: Product) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name-az':
        return a.name.localeCompare(b.name);
      case 'newest':
      default:
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
    }
  };

  if (activeFilter === 'all') {
    sortedProducts = [...filteredProducts].sort(sortFunction);
  } else {
    sortedProducts = [...filteredProducts].sort(sortFunction);
  }

  // Get min and max prices for the current filter (converted to current currency)
  const prices = filteredProducts.map(p => convertPrice(p.price));
  const suggestedMin = prices.length > 0 ? Math.floor(Math.min(...prices) / (currency === 'USD' ? 10 : 1000)) * (currency === 'USD' ? 10 : 1000) : 0;
  const suggestedMax = prices.length > 0 ? Math.ceil(Math.max(...prices) / (currency === 'USD' ? 10 : 1000)) * (currency === 'USD' ? 10 : 1000) : (currency === 'USD' ? 1000 : 1000000);

  return (
    <div className="min-h-screen bg-slate-50/30 relative selection:bg-orange-500 selection:text-white pb-20 lg:pb-0">
      {/* Aesthetic Mobile Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden lg:opacity-70">
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-orange-200/30 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[-10%] right-[-20%] w-[60%] h-[60%] rounded-full bg-rose-200/30 blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-amber-200/30 blur-[100px] animate-pulse" style={{ animationDuration: '9s', animationDelay: '2s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100/40 blur-[80px] animate-pulse" style={{ animationDuration: '11s', animationDelay: '0.5s' }} />
      </div>

      {/* MOBILE HERO */}
      <div className="lg:hidden">
        <MobileHero />
      </div>

      {/* Mobile Featured Products Carousel - Only on Mobile */}
      <div className="lg:hidden">
        {!loading && allProducts.length > 0 && (
          <MobileFeaturedCarousel products={allProducts as any} />
        )}
      </div>

      {/* Hero Section with Filter Tabs */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="pt-0 pb-4 sm:pt-0 sm:pb-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-1 sm:px-4 md:px-6 lg:px-8">

          {/* Banner Slider - Always Visible on Desktop, Hidden on Mobile as we have MobileHero */}
          <div className="mb-12 hidden lg:block">
            <BannerSlider />
          </div>

          {/* Special Products Carousel */}
          {!loading && allProducts.length > 0 && (
            <SpecialProductsCarousel products={allProducts as any} />
          )}

          {/* Filter & Sort Bar */}
          <div className="flex items-center justify-between gap-4 mb-6 px-3 lg:px-0 flex-wrap sticky top-16 lg:static z-30 bg-white/80 backdrop-blur-md lg:bg-transparent py-2 lg:py-0 rounded-2xl lg:rounded-none">
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl font-bold text-xs lg:text-sm transition-all duration-300 whitespace-nowrap ${activeFilter === 'all'
                  ? 'bg-[#FF5000] text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/50 text-gray-600 hover:bg-white border border-gray-100'
                  }`}
              >
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Sparkles className="w-3 h-3 lg:w-3.5 lg:h-3.5" strokeWidth={1.2} />
                  <span>Бүгд</span>
                  {allProducts.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {allProducts.length}
                    </span>
                  )}
                </div>
              </motion.button>

              {([
                { key: 'Бэлэн', icon: Package },
                { key: 'Захиалга', icon: Clock },
              ] as const).map(({ key, icon: Icon }) => {
                const isActive = activeFilter === key;

                // Тоо тооцох
                const count = key === 'Бэлэн'
                  ? allProducts.filter((p: Product) => !p.stockStatus || p.stockStatus === 'in-stock').length
                  : allProducts.filter((p: Product) => p.stockStatus === 'pre-order').length;

                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveFilter(key)}
                    className={`px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl font-bold text-xs lg:text-sm transition-all duration-300 whitespace-nowrap ${isActive
                      ? 'bg-[#FF5000] text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/50 text-gray-600 hover:bg-white border border-gray-100'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 lg:gap-2">
                      <Icon className="w-3 h-3 lg:w-3.5 lg:h-3.5" strokeWidth={1.2} />
                      <span>{key}</span>
                      {count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {count}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 lg:gap-3 ml-auto">
              <div className="flex items-center gap-2 hidden sm:flex">
                <ArrowUpDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 cursor-pointer"
                >
                  <option value="name-az">{t('filters', 'nameAZ')}</option>
                  <option value="price-low">{t('filters', 'priceLowHigh')}</option>
                  <option value="price-high">{t('filters', 'priceHighLow')}</option>
                </select>
              </div>

              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPriceFilter(!showPriceFilter)}
                  className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm font-bold rounded-2xl transition-all duration-300 ${showPriceFilter || minPrice || maxPrice
                    ? 'bg-[#FF5000] text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-[#FF5000]/30'
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={1.2} />
                  <span className="hidden sm:inline">{t('filters', 'price')}</span>
                  {(minPrice || maxPrice) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">1</span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showPriceFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-72 lg:w-80 bg-white rounded-xl shadow-2xl shadow-orange-100/20 border border-orange-100/50 p-4 lg:p-5 z-50"
                    >
                      {/* Price Filter Content - Same as original but slightly more compact if needed */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
                          {t('filters', 'priceFilter')}
                        </h3>
                        <button
                          onClick={() => setShowPriceFilter(false)}
                          className="p-1 hover:bg-gray-100 rounded-full transition"
                        >
                          <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="space-y-4 lg:space-y-5">
                        {/* ... (Existing Price Filter UI) ... */}
                        <div className="flex items-center justify-between px-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('filters', 'minPrice')}</span>
                            <span className="text-base lg:text-lg font-bold text-gray-900">
                              {currency === 'USD' ? '$' : ''}{minPrice || suggestedMin.toLocaleString()}{currency === 'MNT' ? '₮' : ''}
                            </span>
                          </div>
                          <div className="w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 mx-2" />
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('filters', 'maxPrice')}</span>
                            <span className="text-base lg:text-lg font-bold text-gray-900">
                              {currency === 'USD' ? '$' : ''}{maxPrice || suggestedMax.toLocaleString()}{currency === 'MNT' ? '₮' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Inputs */}
                          <div className="relative">
                            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder={suggestedMin.toLocaleString()} className="w-full px-3 py-2 text-sm border rounded-lg" />
                          </div>
                          <div className="relative">
                            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder={suggestedMax.toLocaleString()} className="w-full px-3 py-2 text-sm border rounded-lg" />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="flex-1 px-3 py-2 text-xs lg:text-sm font-medium bg-gray-100 rounded-lg">Clear</button>
                          <button onClick={() => setShowPriceFilter(false)} className="flex-1 px-3 py-2 text-xs lg:text-sm font-bold text-white bg-orange-500 rounded-lg">Apply</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {error ? (
            <div className="text-center py-20 px-4">
              <p className="text-red-500">Error loading products.</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No products found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Grid - Unified with featured first */}
              <div className="hidden lg:block">
                <PremiumProductGrid products={sortedProducts} />
              </div>

              {/* Mobile Grid - Regular products only (featured shown in carousel) */}
              <div className="lg:hidden">
                <MobileProductGrid products={sortedProducts.filter(p => !p.featured)} />
              </div>

              {/* Infinite Scroll Trigger */}
              <InfiniteScrollTrigger
                onLoadMore={() => setSize(size + 1)}
                hasMore={!isReachingEnd}
                isLoading={!!isLoadingMore}
              />
            </>
          )}
        </div>
      </motion.section>

      {/* Footer CTA (Desktop only or adjusted) */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="py-10 sm:py-12 bg-gray-50 border-t border-gray-200 mb-16 lg:mb-0"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {t('footer', 'title')}
          </h3>
          {/* ... footer links */}
        </div>
      </motion.section>
    </div>
  );
}
