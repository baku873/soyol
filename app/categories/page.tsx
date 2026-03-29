'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Filter, ShoppingCart, Eye, ChevronDown, Sparkles, LayoutGrid, List } from 'lucide-react';
import { formatPrice, getStarRating, formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import UniversalProductCard from '@/components/UniversalProductCard';
import type { Product } from '@/models/Product';
import type { Category } from '@/models/Category';

// Emoji mapping for categories (reused for consistency)
const CATEGORY_EMOJIS: Record<string, string> = {
  'all': '🏠',
  'electronics': '💻',
  'fashion': '👗',
  'home': '🏡',
  'beauty': '💄',
  'sports': '⚽',
  'baby': '🍼',
  'watches': '⌚',
  'books': '📚',
  'toys': '🎮',
  'cars': '🚗',
  'tools': '🛠️',
  'food': '🍔',
  'default': '📦'
};

interface Attribute {
  _id: string;
  name: string;
  type: 'select' | 'text' | 'number';
  options: string[];
}

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();

  // Optimized Apple-style collapse with cubic-bezier easing for smoothness
  const headerPadding = useTransform(scrollY, [0, 120], ['1.5rem', '0.75rem'], { clamp: true });
  const titleOpacity = useTransform(scrollY, [0, 60], [1, 0], { clamp: true });
  const titleHeight = useTransform(scrollY, [0, 80], ['auto', '0px'], { clamp: true });
  const titleScale = useTransform(scrollY, [0, 80], [1, 0.95], { clamp: true });
  const titleY = useTransform(scrollY, [0, 80], [0, -10], { clamp: true });
  const pillMarginTop = useTransform(scrollY, [0, 100], ['1rem', '0rem'], { clamp: true });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 40, scale: 0.85, rotateX: 15 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 24,
        mass: 1
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const addItem = useCartStore((state) => state.addItem);

  // Fetch products, categories, and attributes from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, attributesRes] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/categories'),
          fetch('/api/attributes'),
        ]);

        if (!productsRes.ok || !categoriesRes.ok || !attributesRes.ok) {
          console.error('One or more fetch requests failed', {
            products: productsRes.status,
            categories: categoriesRes.status,
            attributes: attributesRes.status
          });
        }

        const productsText = await productsRes.text();
        const categoriesText = await categoriesRes.text();
        const attributesText = await attributesRes.text();

        let productsData, categoriesData, attributesData;

        try {
          productsData = JSON.parse(productsText);
          categoriesData = JSON.parse(categoriesText);
          attributesData = JSON.parse(attributesText);
        } catch (parseError) {
          console.error('JSON Parse Error. Server returned:', {
            products: productsText.substring(0, 100),
            categories: categoriesText.substring(0, 100),
            attributes: attributesText.substring(0, 100)
          });
          throw parseError;
        }

        // API returns { products, nextCursor, hasMore }
        setProducts(productsData.products || []);
        setCategories(categoriesData.categories || (Array.isArray(categoriesData) ? categoriesData : []));
        setAttributes(attributesData);
      } catch (error) {
        // Silently handle error
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getEmoji = (slug: string) => {
    const key = Object.keys(CATEGORY_EMOJIS).find(k => slug.toLowerCase().includes(k));
    return key ? CATEGORY_EMOJIS[key] : CATEGORY_EMOJIS['default'];
  };

  const filteredProducts = products.filter((product: Product) => {
    // Category Filter
    if (selectedCategory !== 'all') {
      if (product.category !== selectedCategory) return false;
    }

    // Attribute Filters
    for (const [attrId, value] of Object.entries(selectedAttributes)) {
      if (value && product.attributes?.[attrId] !== value) {
        return false;
      }
    }

    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'newest':
      default:
        // Assuming products are returned sorted by newest from API or have createdAt
        return 0;
    }
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12 flex flex-col justify-start">
        <div className="max-w-7xl mx-auto pt-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-4 space-y-4 animate-pulse">
                <div className="aspect-square bg-gray-100 rounded-2xl" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto lg:px-8">

        <div className="flex flex-col lg:flex-row gap-8">

          {/* LEFT SIDEBAR (Desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <div className="flex items-center justify-between mb-4 lg:mb-8">
                <h2 className="text-xl font-black text-gray-900">Ангилал</h2>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  Нийт {products.length}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                    setExpandedCategory(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedCategory === 'all'
                    ? 'bg-soyol text-white shadow-md shadow-orange-200'
                    : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">Бүгд</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {products.length}
                  </span>
                </button>

                {categories.map((category) => (
                  <div key={category.id} className="space-y-1">
                    <button
                      onClick={() => {
                        if (selectedCategory === category.id) {
                          setExpandedCategory(expandedCategory === category.id ? null : category.id);
                        } else {
                          setSelectedCategory(category.id);
                          setExpandedCategory(category.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedCategory === category.id
                        ? 'bg-soyol text-white shadow-md shadow-orange-200'
                        : 'hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {category.productCount !== undefined && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedCategory === category.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {category.productCount}
                          </span>
                        )}
                        {category.subcategories && category.subcategories.length > 0 && (
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedCategory === category.id ? 'rotate-180' : ''
                            }`} />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedCategory === category.id && category.subcategories && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-4"
                        >
                          <div className="pl-4 border-l-2 border-gray-100 space-y-1 py-1">
                            {category.subcategories.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => setSelectedSubcategory(sub.id)}
                                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold transition-colors ${selectedSubcategory === sub.id
                                  ? 'text-soyol bg-orange-50'
                                  : 'text-gray-500 hover:text-gray-900'
                                  }`}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 lg:min-w-0">

            {/* Header & Filters */}
            <motion.div
              style={{ padding: headerPadding, top: 'calc(52px + env(safe-area-inset-top))' }}
              className="bg-white lg:rounded-3xl shadow-sm border-b lg:border border-gray-100 sticky z-20 will-change-[padding]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <motion.div
                  style={{
                    height: titleHeight,
                    opacity: titleOpacity,
                    scale: titleScale,
                    y: titleY,
                    marginBottom: titleOpacity
                  }}
                  className="overflow-hidden origin-top-left lg:h-auto lg:mb-0 lg:opacity-100 lg:scale-100 lg:translate-y-0 will-change-[height,opacity,transform]"
                >
                  <h1 className="text-xl lg:text-4xl font-black text-gray-900 mb-1">
                    {selectedCategory === 'all' ? 'Бүх бараа' : categories.find(c => c.id === selectedCategory)?.name}
                  </h1>
                  <p className="text-sm lg:text-base text-gray-600">
                    {sortedProducts.length} бараа олдлоо
                  </p>
                </motion.div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                  <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-soyol shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-soyol shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-gray-50 border border-gray-100 text-gray-700 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-soyol/20"
                  >
                    <option value="newest">Шинэ</option>
                    <option value="price-asc">Үнэ ↑</option>
                    <option value="price-desc">Үнэ ↓</option>
                    <option value="name-asc">Нэр А-Я</option>
                  </select>
                </div>
              </div>

              {/* Mobile Horizontal Category Pills (Alternative to Sidebar) */}
              <motion.div
                style={{ marginTop: pillMarginTop }}
                className="relative lg:hidden -mx-4"
              >
                <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-2 -mb-2">
                  <motion.button
                    onClick={() => setSelectedCategory('all')}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === 'all'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {selectedCategory === 'all' && (
                      <motion.div
                        layoutId="activeCategory"
                        className="absolute inset-0 bg-soyol rounded-full shadow-md shadow-orange-200"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Бүгд</span>
                  </motion.button>
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      whileTap={{ scale: 0.95 }}
                      className={`relative flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat.id
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {selectedCategory === cat.id && (
                        <motion.div
                          layoutId="activeCategory"
                          className="absolute inset-0 bg-soyol rounded-full shadow-md shadow-orange-200"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{cat.name}</span>
                    </motion.button>
                  ))}
                </div>
                {/* Fade Gradients */}
                <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              </motion.div>
            </motion.div>

            {/* Product Grid */}
            <AnimatePresence mode="wait">
              {sortedProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100"
                >
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Энэ ангилалд бараа олдсонгүй</h3>
                  <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
                    Та өөр ангилал сонгох эсвэл хайлтын утгаа өөрчилж үзнэ үү.
                  </p>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="px-6 py-3 bg-soyol text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 transition-colors"
                  >
                    Бүх бараа харах
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedCategory + sortBy}
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  className={
                    viewMode === 'grid'
                      ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 px-4 lg:px-0"
                      : "flex flex-col gap-4 px-4 lg:px-0"
                  }
                >
                  {sortedProducts.map((product, index) => (
                    <motion.div key={product.id} variants={itemVariants}>
                      <UniversalProductCard
                        product={product}
                        index={index}
                        disableInitialAnimation={true}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
