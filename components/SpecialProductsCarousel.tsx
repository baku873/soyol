'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Flame } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

import ProductBadge from './ProductBadge';
import UniversalProductCard from './UniversalProductCard';

interface Product {
    id: string;
    _id?: string;
    name: string;
    price: number;
    image?: string | null;
    rating?: number;
    category?: string;
    stockStatus?: string;
    inventory?: number;
    featured?: boolean;
    sections?: string[];
}

interface SpecialProductsCarouselProps {
    products: Product[];
}

export default function SpecialProductsCarousel({ products }: SpecialProductsCarouselProps) {
    const { convertPrice, currency } = useLanguage();
    const { t } = useTranslation();
    const addItem = useCartStore((s) => s.addItem);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftPos, setScrollLeftPos] = useState(0);
    const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

    const specialProducts = products.filter((p) => p.featured || p.sections?.includes('Онцгой') || p.sections?.includes('Онцлох'));
    const displayProducts = specialProducts.length > 0 ? specialProducts : products.slice(0, 12);

    const updateScrollButtons = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 5);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const cardW = 340;
        el.scrollBy({ left: direction === 'left' ? -cardW : cardW, behavior: 'smooth' });
    };

    const startAutoScroll = useCallback(() => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        autoScrollRef.current = setInterval(() => {
            const el = scrollRef.current;
            if (!el) return;
            if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 5) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                el.scrollBy({ left: 340, behavior: 'smooth' });
            }
        }, 4500);
    }, []);

    const stopAutoScroll = () => {
        if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
            autoScrollRef.current = null;
        }
    };

    useEffect(() => {
        startAutoScroll();
        return () => stopAutoScroll();
    }, [startAutoScroll]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollButtons);
        updateScrollButtons();
        return () => el.removeEventListener('scroll', updateScrollButtons);
    }, [updateScrollButtons]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
        setScrollLeftPos(scrollRef.current?.scrollLeft || 0);
        stopAutoScroll();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
        const walk = (x - startX) * 1.5;
        if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeftPos - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        startAutoScroll();
    };

    const handleAddToCart = (product: Product) => {
        addItem({
            id: product.id || product._id || '',
            name: product.name,
            price: product.price,
            image: product.image || '',
            rating: product.rating ?? 0,
            category: product.category || '',
            stockStatus: (product.stockStatus as 'in-stock' | 'pre-order') || 'in-stock',
        });
        toast.success(t('toast', 'addedToCart'), {
            style: { borderRadius: '16px', background: '#1e293b', color: '#fff', fontWeight: 600 },
            iconTheme: { primary: '#f97316', secondary: '#fff' },
        });
    };

    const formatPrice = (price: number) => {
        const converted = convertPrice(price);
        return currency === 'USD'
            ? `$${converted.toLocaleString()}`
            : `${converted.toLocaleString()}₮`;
    };

    if (displayProducts.length === 0) return null;

    return (
        <section className="mb-12 relative hidden lg:block">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                            <Flame className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                            Онцгой бараанууд
                        </h2>
                        <p className="text-sm lg:text-base text-slate-500 font-medium mt-0.5">
                            Таны анхаарлыг татах бараанууд
                        </p>
                    </div>
                </div>

                {/* Navigation Arrows */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { scroll('left'); stopAutoScroll(); startAutoScroll(); }}
                        disabled={!canScrollLeft}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${canScrollLeft
                            ? 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 shadow-sm hover:shadow-md'
                            : 'bg-slate-100 border-2 border-slate-100 text-slate-300 cursor-default'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => { scroll('right'); stopAutoScroll(); startAutoScroll(); }}
                        disabled={!canScrollRight}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${canScrollRight
                            ? 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 shadow-sm hover:shadow-md'
                            : 'bg-slate-100 border-2 border-slate-100 text-slate-300 cursor-default'
                            }`}
                    >
                        <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Carousel Track */}
            <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseEnter={stopAutoScroll}
                className="flex gap-5 lg:gap-6 overflow-x-auto scroll-smooth cursor-grab active:cursor-grabbing select-none pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                {displayProducts.map((product, i) => (
                    <motion.div
                        key={product.id || product._id || i}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06, duration: 0.5 }}
                        className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[280px]"
                    >
                        <UniversalProductCard
                            product={product as any}
                            disableInitialAnimation={true}
                            index={i}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Edge Fades */}
            {canScrollLeft && (
                <div className="absolute left-0 top-[96px] bottom-0 w-16 bg-gradient-to-r from-slate-50/90 to-transparent pointer-events-none z-10 hidden lg:block" />
            )}
            {canScrollRight && (
                <div className="absolute right-0 top-[96px] bottom-0 w-16 bg-gradient-to-l from-slate-50/90 to-transparent pointer-events-none z-10 hidden lg:block" />
            )}
        </section>
    );
}
