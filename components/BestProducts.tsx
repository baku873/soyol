'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Star,
    Tag,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const AUTOPLAY_DURATION = 6000;

interface Product {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    category: string;
    stockStatus?: string;
    description?: string | null;
}

interface BestProductsProps {
    products: Product[];
}

export default function BestProducts({ products }: BestProductsProps) {
    const { formatPrice } = useLanguage();
    const [slideIndex, setSlideIndex] = useState(0);
    const [direction, setDirection] = useState(0); // -1 for left, 1 for right
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    if (!products || products.length === 0) return null;

    const featuredProducts = products.slice(0, 5);
    const activeProduct = featuredProducts[slideIndex];

    // --- AUTOPLAY LOGIC ---
    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    useEffect(() => {
        resetTimeout();
        timeoutRef.current = setTimeout(() => {
            setDirection(1);
            setSlideIndex((prev) => (prev + 1) % featuredProducts.length);
        }, AUTOPLAY_DURATION);

        return () => resetTimeout();
    }, [slideIndex, featuredProducts.length]);

    // --- NAVIGATION HANDLERS ---
    const paginate = (newDirection: number) => {
        resetTimeout();
        setDirection(newDirection);
        setSlideIndex((prev) => {
            let nextIndex = prev + newDirection;
            if (nextIndex < 0) nextIndex = featuredProducts.length - 1;
            if (nextIndex >= featuredProducts.length) nextIndex = 0;
            return nextIndex;
        });
    };

    // Calculate mock discount
    const fakeOldPrice = activeProduct.price * 1.2;
    const discount = Math.round(((fakeOldPrice - activeProduct.price) / fakeOldPrice) * 100);

    return (
        <section className="relative w-full max-w-[1500px] mx-auto mb-16 mt-8 px-4">
            {/* Main Slider Container */}
            <div className="relative h-[500px] sm:h-[600px] w-full bg-[#f8f9fa] overflow-hidden rounded-3xl shadow-2xl shadow-orange-500/5 group border border-white/50">

                <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                    <motion.div
                        key={slideIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                        className="absolute inset-0 w-full h-full flex"
                    >
                        {/* BACKGROUND IMAGE LAYER */}
                        <div className="absolute inset-0 z-0">
                            <Image
                                src={activeProduct.image || '/placeholder.png'}
                                alt={activeProduct.name}
                                fill
                                className="object-cover object-center lg:object-right-top scale-105" // Zoomed slightly for drama
                                priority
                                sizes="(max-width: 1500px) 100vw, 1500px"
                            />
                        </div>

                        {/* PREMIUM GRADIENT MASKS */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa] via-[#f8f9fa]/80 to-transparent sm:via-[#f8f9fa]/40 z-10 w-[95%] sm:w-[65%] lg:w-[50%]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f9fa] via-transparent to-transparent z-10 lg:hidden h-1/2 bottom-0 top-auto" />

                        {/* CONTENT LAYER */}
                        <div className="relative z-20 container mx-auto px-8 sm:px-16 h-full flex flex-col justify-center max-w-[1400px]">
                            <div className="max-w-xl pt-8 sm:pt-0">

                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center gap-3 mb-6"
                                >
                                    {/* Category Tag */}
                                    <span className="px-3 py-1 bg-orange-100/80 backdrop-blur-sm text-orange-600 text-xs font-bold uppercase tracking-widest rounded-full border border-orange-200/50">
                                        {activeProduct.category}
                                    </span>
                                    {/* Rating with Glass effect */}
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-white/40 shadow-sm">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span className="text-xs font-bold text-slate-700">4.9</span>
                                        <span className="text-[10px] text-slate-500 font-medium">(24.5k)</span>
                                    </div>
                                </motion.div>

                                {/* Product Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 text-slate-900 tracking-tight drop-shadow-sm"
                                >
                                    {activeProduct.name}
                                </motion.h2>

                                {/* Price Block */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex flex-wrap items-center gap-4 mb-10"
                                >
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-6xl font-bold text-orange-500 tracking-tighter">
                                            {activeProduct.price.toLocaleString()}
                                        </span>
                                        <span className="text-4xl font-bold text-orange-500 align-baseline">
                                            ₮
                                        </span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-lg line-through decoration-slate-300 decoration-1">
                                            {formatPrice(fakeOldPrice)}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md self-start">
                                            <Tag className="w-3 h-3 fill-current" />
                                            <span className="text-xs">save {discount}%</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* CTA Button - Premium Orange Gradient */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex flex-wrap gap-4"
                                >
                                    <Link href={`/product/${activeProduct.id}`}>
                                        <button className="group relative px-8 py-4 bg-gradient-to-r from-[#FF5000] to-[#FF8000] text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                            <span className="relative flex items-center gap-3">
                                                Shop Collection
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        </button>
                                    </Link>

                                    <button className="px-8 py-4 bg-white/80 backdrop-blur-sm text-slate-700 border border-white/50 rounded-2xl font-bold text-lg shadow-lg shadow-slate-200/50 hover:bg-white hover:text-orange-600 transition-all duration-300">
                                        View Details
                                    </button>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* --- GLASSMORPHIC NAVIGATION --- */}

                {/* Dots Indicator - Clean & Modern */}
                <div className="absolute bottom-8 left-8 sm:left-16 z-30 flex gap-3">
                    {featuredProducts.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setDirection(index > slideIndex ? 1 : -1);
                                setSlideIndex(index);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-500 ${index === slideIndex
                                    ? 'w-12 bg-orange-500 shadow-lg shadow-orange-500/50'
                                    : 'w-3 bg-slate-300 hover:bg-slate-400'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Arrows - Floating Glass Circles */}
                <div className="absolute bottom-8 right-8 sm:right-12 z-30 flex gap-3">
                    <button
                        onClick={() => paginate(-1)}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-md border border-white/60 text-slate-700 shadow-lg shadow-slate-200/50 hover:bg-white hover:text-orange-600 hover:scale-110 active:scale-95 transition-all duration-300 group"
                    >
                        <ChevronLeft className="w-6 h-6 relative right-0.5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <button
                        onClick={() => paginate(1)}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-md border border-white/60 text-slate-700 shadow-lg shadow-slate-200/50 hover:bg-white hover:text-orange-600 hover:scale-110 active:scale-95 transition-all duration-300 group"
                    >
                        <ChevronRight className="w-6 h-6 relative left-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </section>
    );
}

/* ────────────────────── Slide Animation Variants ────────────────────── */
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0,
        zIndex: 0
    }),
    center: {
        x: 0,
        opacity: 1,
        zIndex: 1
    },
    exit: (direction: number) => ({
        x: direction < 0 ? "100%" : "-100%",
        opacity: 0,
        zIndex: 0
    })
};
