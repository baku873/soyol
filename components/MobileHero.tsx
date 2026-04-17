'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Banner } from '@/models/Banner';

const AUTO_PLAY_MS = 5000;

export default function MobileHero() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        fetch('/api/banners')
            .then((res) => res.json())
            .then((data) => setBanners(data.banners || []))
            .catch((err) => console.error('Error fetching banners:', err))
            .finally(() => setIsLoading(false));
    }, []);

    const goTo = useCallback(
        (idx: number) =>
            setCurrentIndex(((idx % banners.length) + banners.length) % banners.length),
        [banners.length],
    );
    const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
    const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

    useEffect(() => {
        if (isPaused || banners.length <= 1) return;
        const t = setInterval(next, AUTO_PLAY_MS);
        return () => clearInterval(t);
    }, [next, isPaused, banners.length]);

    useEffect(() => {
        if (banners.length > 0 && currentIndex >= banners.length) setCurrentIndex(0);
    }, [banners.length, currentIndex]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        setIsPaused(true);
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
        touchStartX.current = null;
        setIsPaused(false);
    };

    const banner = banners[currentIndex];

    // ── Skeleton ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <section className="w-full bg-white lg:hidden mt-2 mb-4" aria-label="Featured promotions banner">
                <div className="mx-3 rounded-2xl overflow-hidden bg-slate-100 animate-pulse" style={{ aspectRatio: '16/7' }} />
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-slate-200" />)}
                    </div>
                    <div className="w-28 h-9 rounded-full bg-slate-100 animate-pulse" />
                </div>
                <div className="flex justify-between px-3 pt-5 pb-2 gap-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-14 h-14 rounded-[18px] bg-slate-100 animate-pulse" />
                            <div className="w-9 h-2.5 rounded bg-slate-100 animate-pulse" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (banners.length === 0) return null;

    return (
        <section className="w-full bg-white lg:hidden mt-2 mb-4" aria-label="Featured promotions banner">

            {/* ── Pure image card — zero overlapping UI inside ────────────────── */}
            <div
                className="mx-3 relative rounded-2xl overflow-hidden"
                style={{
                    aspectRatio: '16/7',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)',
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                aria-label={`Слайд ${currentIndex + 1} / ${banners.length}`}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.38, ease: 'easeInOut' }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={banner?.image || ''}
                            alt={banner?.title || `Banner ${currentIndex + 1}`}
                            fill
                            priority={currentIndex === 0}
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        {/* Very subtle edge vignette only — no heavy overlay */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background:
                                    'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 38%)',
                            }}
                            aria-hidden="true"
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Below-card row: dots left, CTA right ───────────────────────── */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">

                {/* Slide indicators */}
                <div
                    className="flex items-center gap-1.5"
                    role="tablist"
                    aria-label="Слайд сонгох"
                >
                    {banners.map((b, i) => {
                        const isActive = i === currentIndex;
                        return (
                            <button
                                key={b.id}
                                role="tab"
                                aria-selected={isActive}
                                aria-label={`Слайд ${i + 1}`}
                                onClick={() => { goTo(i); setIsPaused(false); }}
                                className={[
                                    'relative rounded-full overflow-hidden transition-all duration-500 ease-out',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F57E20]',
                                    isActive
                                        ? 'w-6 h-[5px] bg-[#F57E20]/30'
                                        : 'w-[5px] h-[5px] bg-gray-200 hover:bg-gray-300',
                                ].join(' ')}
                            >
                                {isActive && !isPaused && (
                                    <motion.div
                                        key={`prog-${currentIndex}`}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: AUTO_PLAY_MS / 1000, ease: 'linear' }}
                                        className="absolute inset-0 bg-[#F57E20] rounded-full origin-left"
                                        aria-hidden="true"
                                    />
                                )}
                                {isActive && isPaused && (
                                    <div className="absolute inset-0 bg-[#F57E20] rounded-full" aria-hidden="true" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* CTA — only when banner has a link or title */}
                {(banner?.link || banner?.title) && (
                    <motion.div
                        key={`cta-${currentIndex}`}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <Link
                            href={banner.link || '/'}
                            className="group inline-flex items-center gap-1.5 rounded-full bg-[#F57E20] px-4 py-2 text-[12px] font-bold text-white tracking-wide shadow-[0_4px_14px_rgba(245,126,32,0.38)] hover:bg-[#E06B12] active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F57E20] focus-visible:ring-offset-2"
                            aria-label={banner.title || 'Дэлгэрэнгүй'}
                        >
                            {banner.title || 'Дэлгэрэнгүй'}
                            <ArrowRight
                                className="w-3 h-3 text-white/80 group-hover:translate-x-0.5 transition-transform duration-150"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        </Link>
                    </motion.div>
                )}
            </div>

            {/* ── Quick-action category row ───────────────────────────────────── */}
            <div
                className="flex justify-between items-start px-3 pt-5 pb-2 gap-2 overflow-x-auto scrollbar-hide"
                role="navigation"
                aria-label="Ангилал"
            >
                {[
                    { name: 'Шинэ',     icon: '🔥', href: '/new-arrivals',  bg: 'bg-orange-50',  ring: 'ring-orange-100'  },
                    { name: 'Бэлэн',    icon: '📦', href: '/ready-to-ship', bg: 'bg-sky-50',     ring: 'ring-sky-100'     },
                    { name: 'Захиалга', icon: '🌍', href: '/pre-order',     bg: 'bg-violet-50',  ring: 'ring-violet-100'  },
                    { name: 'Хямдрал',  icon: '🏷️', href: '/sale',          bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
                ].map((item) => (
                    <motion.a
                        key={item.name}
                        href={item.href}
                        whileTap={{ scale: 0.88 }}
                        className="flex flex-col items-center gap-1.5 flex-1 min-w-[64px] max-w-[80px] select-none"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <div
                            className={`w-14 h-14 rounded-[18px] ${item.bg} ring-1 ${item.ring} flex items-center justify-center text-[26px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]`}
                            aria-hidden="true"
                        >
                            {item.icon}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 tracking-tight text-center leading-tight">
                            {item.name}
                        </span>
                    </motion.a>
                ))}
            </div>
        </section>
    );
}
