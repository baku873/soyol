'use client';

import { useState, useRef } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWishlistStore } from '../store/wishlistStore';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import ProductBadge from '../components/ProductBadge';

interface Product {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    originalPrice?: number;
    discountPercent?: number;
    sections?: string[];
    image?: string | null;
    images?: string[];
    category: string;
    stockStatus?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    discount?: number;
    inventory?: number;
    rating?: number;
    featured?: boolean;
    isCargo?: boolean;
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.25
        } as any
    },
};

export default function PremiumProductCard({ product, isFeatured = false }: { product: Product, isFeatured?: boolean }) {
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { formatPrice: formatPriceWithCurrency } = useLanguage();
    const { t } = useTranslation();
    const router = useRouter();
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [activeIdx, setActiveIdx] = useState(0);
    const isDragging = useRef(false);

    const isWishlisted = isInWishlist(product.id);

    // Build images array: combine main image + additional images, deduplicate
    const allImages: string[] = (() => {
        const combined: string[] = [];
        if (product.image) combined.push(product.image);
        if (product.images?.length) {
            product.images.forEach(img => {
                if (!combined.includes(img)) combined.push(img);
            });
        }
        return combined.length > 0 ? combined : ['/placeholder.png'];
    })();

    const hasMultiple = allImages.length > 1;

    return (
        <motion.div
            variants={itemVariants}
            className="group h-full touch-action-manipulation"
            style={{ touchAction: 'manipulation' }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Link href={`/product/${product.id}`} className="block h-full" onClick={(e) => { if (isDragging.current) e.preventDefault(); }}>
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-200 h-full flex flex-col relative">

                    {/* Image Section with Slider */}
                    <div className="relative aspect-square overflow-hidden bg-gray-50/50">
                        {/* Badges */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
                            <ProductBadge
                                sections={product.sections}
                                isFeatured={product.featured}
                                createdAt={product.createdAt}
                                className="z-10"
                            />
                            {(!product.sections?.includes('Захиалга') || product.sections?.includes('Бэлэн')) && (
                                <div className="px-2.5 py-1 bg-emerald-50/90 backdrop-blur-md border border-emerald-200/50 rounded-lg flex items-center shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                    <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-emerald-700 uppercase">
                                        БЭЛЭН
                                    </span>
                                </div>
                            )}
                            {product.sections?.includes('Захиалга') && (
                                <div className="px-2.5 py-1 bg-blue-50/90 backdrop-blur-md border border-blue-200/50 rounded-lg flex items-center shadow-sm">
                                    <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-blue-700 uppercase">
                                        ЗАХИАЛГА
                                    </span>
                                </div>
                            )}
                            {(!product.sections || !product.sections.includes('Шинэ')) && !product.stockStatus && (
                                <div className="px-2.5 py-1 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-full flex items-center shadow-sm">
                                    <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-white uppercase">
                                        {product.category}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Wishlist Button */}
                        <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isWishlisted) {
                                    removeFromWishlist(product.id);
                                    toast.success(t('product', 'removedFromWishlist'));
                                } else {
                                    addToWishlist({ ...product } as any);
                                    toast.success(t('product', 'addedToWishlist'));
                                }
                            }}
                            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white shadow-md hover:scale-110 transition-transform"
                        >
                            <Heart
                                className={`w-4 h-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                            />
                        </motion.button>

                        {/* Image Slider */}
                        {hasMultiple ? (
                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.1}
                                onDragStart={() => { isDragging.current = true; }}
                                onDragEnd={(_, info) => {
                                    if (Math.abs(info.offset.x) > 50) {
                                        if (info.offset.x < 0 && activeIdx < allImages.length - 1) setActiveIdx(p => p + 1);
                                        else if (info.offset.x > 0 && activeIdx > 0) setActiveIdx(p => p - 1);
                                    }
                                    setTimeout(() => { isDragging.current = false; }, 10);
                                }}
                                animate={{ x: `-${activeIdx * 100}%` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="flex w-full h-full"
                            >
                                {allImages.map((img, i) => (
                                    <div key={i} className="w-full h-full shrink-0 relative">
                                        <Image
                                            src={img}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-400 ease-in-out p-2"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <Image
                                src={allImages[0]}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-400 ease-in-out p-2"
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        )}

                        {/* Dot Indicators */}
                        {hasMultiple && (
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                                {allImages.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIdx(i); }}
                                        className={`rounded-full transition-all duration-300 ${activeIdx === i ? 'w-4 h-1.5 bg-[#FF5000]' : 'w-1.5 h-1.5 bg-slate-300/80'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Arrow Nav (Desktop hover only) */}
                        {hasMultiple && (
                            <>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIdx(p => Math.max(0, p - 1)); }}
                                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 text-slate-600 hover:text-[#FF5000] disabled:opacity-0"
                                    disabled={activeIdx === 0}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIdx(p => Math.min(allImages.length - 1, p + 1)); }}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 text-slate-600 hover:text-[#FF5000] disabled:opacity-0"
                                    disabled={activeIdx === allImages.length - 1}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                        <h3 className="text-base sm:text-lg font-black text-gray-900 leading-[1.1] mb-3 line-clamp-2 tracking-tight group-hover:text-orange-600 transition-colors">
                            {product.name} {product.isCargo && " + Карго"}
                        </h3>

                        {product.isCargo && (
                            <div className="mt-[-4px] mb-2 sm:mt-[-6px]">
                                <span className="text-[10px] sm:text-[11px] font-bold text-[#FF5000] bg-[#FF5000]/10 px-2 py-0.5 rounded-md inline-block">📦 Карго</span>
                            </div>
                        )}

                        <div className="mt-auto mb-4">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <div className="flex items-start">
                                    <span className="text-sm font-bold text-[#FF6B00] mr-0.5 mt-1">₮</span>
                                    <span className="text-2xl sm:text-2xl font-black text-[#FF6B00] tracking-tight">
                                        {formatPriceWithCurrency(product.price).replace(/[^\d.,]/g, '')}
                                    </span>
                                </div>

                                {product.originalPrice && product.originalPrice > product.price && (
                                    <span className="text-xs font-medium text-[#AAA] line-through decoration-[#AAA]/50">
                                        {Math.round(product.originalPrice).toLocaleString()}₮
                                    </span>
                                )}
                                {product.originalPrice && product.originalPrice > product.price && (
                                    <ArrowRight className="w-3 h-3 text-[#AAA]" />
                                )}
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="relative w-full py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 font-bold text-xs sm:text-sm shadow-sm group-hover:bg-gray-900 group-hover:text-white group-hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden">
                                <span className="relative z-10">{isAdmin ? '✏️ Засварлах' : 'Дэлгэрэнгүй'}</span>
                                {!isAdmin && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
