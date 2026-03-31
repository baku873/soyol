'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Package, Clock, Sparkles, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
import PremiumProductGrid from '@/components/PremiumProductGrid';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/context/LanguageContext';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string;
  stockStatus: string;
  createdAt: Date;
  updatedAt: Date;
  discount?: number;
}

type FilterType = 'all' | 'ready' | 'preorder';
type SortType = 'newest' | 'price-low' | 'price-high' | 'name-az';

export default function DealsPage() {
  const { t } = useTranslation();
  const { currency, convertPrice } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name-az');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?limit=50');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // --- Filtering Logic ---

  const readyProducts = products.filter(p => p.stockStatus === 'in-stock');
  const preOrderProducts = products.filter(p => p.stockStatus === 'pre-order');

  let filteredProducts = activeFilter === 'all'
    ? [...readyProducts, ...preOrderProducts]
    : activeFilter === 'ready'
      ? readyProducts
      : preOrderProducts;

  const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
  const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;

  if (minPrice || maxPrice) {
    filteredProducts = filteredProducts.filter(p => {
      const convertedPrice = convertPrice(p.price);
      return convertedPrice >= minPriceNum && convertedPrice <= maxPriceNum;
    });
  }

  let sortedProducts: Product[];

  if (activeFilter === 'all') {
    const sortFunction = (a: Product, b: Product) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'name-az': return a.name.localeCompare(b.name);
        case 'newest': default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    };
    const sortedReady = filteredProducts.filter(p => p.stockStatus === 'in-stock').sort(sortFunction);
    const sortedPreOrder = filteredProducts.filter(p => p.stockStatus === 'pre-order').sort(sortFunction);
    sortedProducts = [...sortedReady, ...sortedPreOrder];
  } else {
    sortedProducts = [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'name-az': return a.name.localeCompare(b.name);
        case 'newest': default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full text-purple-600 font-bold text-sm mb-4"
          >
            <Tag className="w-4 h-4" />
            <span>{t('nav', 'deals')}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
          >
            {t('nav', 'deals')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-2xl mx-auto"
          >
            {t('nav', 'dealsDescription')}
          </motion.p>
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter('all')}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${activeFilter === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('filters', 'all')}</span>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter('ready')}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${activeFilter === 'ready'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                <span>{t('filters', 'ready')}</span>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter('preorder')}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${activeFilter === 'preorder'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md shadow-gray-500/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('filters', 'preorder')}</span>
              </div>
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort & Price Filter UI (Same as before) */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 cursor-pointer"
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
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${showPriceFilter || minPrice || maxPrice
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
                  }`}
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
                <span>{t('filters', 'price')}</span>
              </motion.button>

              {/* Price Filter Dropdown */}
              <AnimatePresence>
                {showPriceFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl shadow-purple-100/20 border border-purple-100/50 p-5 z-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
                        {t('filters', 'priceFilter')}
                      </h3>
                      <button onClick={() => setShowPriceFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                        <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      </button>
                    </div>
                    {/* Price Inputs & Buttons */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-purple-500" />
                        <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">{t('filters', 'clear')}</button>
                        <button onClick={() => setShowPriceFilter(false)} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg">{t('filters', 'apply')}</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sortedProducts.length > 0 ? (
          <motion.div key={`${activeFilter}-${sortBy}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PremiumProductGrid products={sortedProducts as any} disableFeaturedSeparation />
          </motion.div>
        ) : (
          <div className="text-center py-20 text-gray-500">{t('product', 'noProducts')}</div>
        )}
      </div>
    </div>
  );
}
