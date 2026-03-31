'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
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

type SortType = 'newest' | 'price-low' | 'price-high' | 'name-az';

export default function PreOrderPage() {
  const { t } = useTranslation();
  const { currency, convertPrice } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [sortBy, setSortBy] = useState<SortType>('name-az');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?limit=50');
        const data = await response.json();
        const allProducts: Product[] = data.products || [];
        const preOrderProducts = allProducts.filter(p => p.stockStatus === 'pre-order');
        setProducts(preOrderProducts);
      } catch (error) {
        // Error handling - could log to error tracking service in production
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // --- Filtering Logic ---

  // Since we only have pre-order products, we just use the main products array
  let filteredProducts = [...products];

  // Apply price filter
  const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
  const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;

  if (minPrice || maxPrice) {
    filteredProducts = filteredProducts.filter(p => {
      const convertedPrice = convertPrice(p.price);
      return convertedPrice >= minPriceNum && convertedPrice <= maxPriceNum;
    });
  }

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name-az':
        return a.name.localeCompare(b.name);
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Get min and max prices for the current filter (converted to current currency)
  const prices = filteredProducts.map(p => convertPrice(p.price));
  const suggestedMin = prices.length > 0 ? Math.floor(Math.min(...prices) / (currency === 'USD' ? 10 : 1000)) * (currency === 'USD' ? 10 : 1000) : 0;
  const suggestedMax = prices.length > 0 ? Math.ceil(Math.max(...prices) / (currency === 'USD' ? 10 : 1000)) * (currency === 'USD' ? 10 : 1000) : (currency === 'USD' ? 1000 : 1000000);

  return (
    <div className="min-h-screen bg-white pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-700 font-bold text-sm mb-4"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('nav', 'preOrder')}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
          >
            {t('nav', 'preOrder')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-2xl mx-auto"
          >
            {t('nav', 'preOrderDescription')}
          </motion.p>
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex items-center justify-end gap-4 mb-8 flex-wrap">
          {/* Sort & Price Filter - Right */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 cursor-pointer"
              >
                <option value="name-az">{t('filters', 'nameAZ')}</option>
                <option value="price-low">{t('filters', 'priceLowHigh')}</option>
                <option value="price-high">{t('filters', 'priceHighLow')}</option>
              </select>
            </div>

            {/* Price Filter Button */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${showPriceFilter || minPrice || maxPrice
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                  }`}
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
                <span>{t('filters', 'price')}</span>
                {(minPrice || maxPrice) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">1</span>
                )}
              </motion.button>

              {/* Price Filter Dropdown */}
              <AnimatePresence>
                {showPriceFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl shadow-orange-100/20 border border-orange-100/50 p-5 z-50"
                  >
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

                    <div className="space-y-4">
                      {/* Price Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('filters', 'minPrice')}</label>
                          <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder={suggestedMin.toLocaleString()}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('filters', 'maxPrice')}</label>
                          <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder={suggestedMax.toLocaleString()}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
                          />
                        </div>
                      </div>

                      {/* Quick Price Ranges */}
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">{t('filters', 'quickSelect')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(currency === 'USD'
                            ? [
                              { label: '< $30', min: '', max: '100000' },
                              { label: '$30 - $145', min: '100000', max: '500000' },
                              { label: '$145 - $290', min: '500000', max: '1000000' },
                              { label: '> $290', min: '1000000', max: '' },
                            ]
                            : [
                              { label: '< 100,000₮', min: '', max: '100000' },
                              { label: '100k - 500k₮', min: '100000', max: '500000' },
                              { label: '500k - 1M₮', min: '500000', max: '1000000' },
                              { label: '> 1,000,000₮', min: '1000000', max: '' },
                            ]
                          ).map((range) => (
                            <button
                              key={range.label}
                              onClick={() => {
                                setMinPrice(range.min);
                                setMaxPrice(range.max);
                              }}
                              className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all duration-300"
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setMinPrice('');
                            setMaxPrice('');
                          }}
                          className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                          {t('filters', 'clear')}
                        </button>
                        <button
                          onClick={() => setShowPriceFilter(false)}
                          className="flex-1 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 rounded-lg transition-all duration-300"
                        >
                          {t('filters', 'apply')}
                        </button>
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
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sortedProducts.length > 0 ? (
          <motion.div
            key={sortBy}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PremiumProductGrid products={sortedProducts as any} disableFeaturedSeparation />
          </motion.div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            {t('product', 'noProductsPreorder')}
          </div>
        )}
      </div>
    </div>
  );
}
