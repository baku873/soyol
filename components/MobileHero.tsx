'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

import { Banner } from '@/models/Banner';

export default function MobileHero() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = useCallback(() => {
        if (banners.length === 0) return;
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, [banners.length]);

    useEffect(() => {
        if (currentIndex >= banners.length && banners.length > 0) {
            setCurrentIndex(0);
        }
    }, [banners.length, currentIndex]);

    useEffect(() => {
        fetch('/api/banners')
            .then(res => res.json())
            .then(data => setBanners(data.banners || []))
            .catch(err => console.error('Error fetching banners:', err))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [nextSlide, banners.length]);

    if (isLoading || banners.length === 0) {
        return (
            <div className="mx-4 mt-4 relative rounded-2xl overflow-hidden bg-slate-100 animate-pulse aspect-[16/9]" />
        );
    }

    return (
        <section className="relative w-full bg-white lg:hidden mb-5 mt-3">
            {/* Floating Card Container */}
            <div className="mx-3 sm:mx-4 relative rounded-[24px] overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
                <div className="relative aspect-[16/9] w-full bg-slate-100">
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 w-full h-full"
                        >
                            <Image
                                src={banners[currentIndex]?.image || ''}
                                alt={banners[currentIndex]?.title || `Banner ${currentIndex + 1}`}
                                fill
                                priority
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            {/* Subtle Overlay for text readability if needed */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                        </motion.div>
                    </AnimatePresence>

                    {/* Indicators - Floating Pill */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                        {banners.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-1.5 rounded-full transition-all duration-300 backdrop-blur-sm ${index === currentIndex
                                    ? 'w-4 bg-white shadow-sm'
                                    : 'w-1.5 bg-white/60 hover:bg-white/80'
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions / Categories for Mobile */}
            <div className="flex justify-between items-start px-5 pt-7 pb-2 bg-white overflow-x-auto gap-3 scrollbar-hide">
                {[
                    { name: 'Шинэ', icon: '🔥', href: '/new-arrivals' },
                    { name: 'Бэлэн', icon: '📦', href: '/ready-to-ship' },
                    { name: 'Захиалга', icon: '🌍', href: '/pre-order' },
                    { name: 'Хямдрал', icon: '🏷️', href: '/sale' },
                ].map((item) => (
                    <motion.a
                        key={item.name}
                        href={item.href}
                        whileTap={{ scale: 0.92 }}
                        className="flex flex-col items-center gap-2 flex-1 max-w-[76px]"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <div className="w-[60px] h-[60px] rounded-[20px] bg-white flex items-center justify-center text-[28px] border border-black/[0.04]" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                            {item.icon}
                        </div>
                        <span className="text-[11px] font-semibold text-[#1C1C1E] tracking-tight text-center leading-tight">
                            {item.name}
                        </span>
                    </motion.a>
                ))}
            </div>
        </section>
    );
}
