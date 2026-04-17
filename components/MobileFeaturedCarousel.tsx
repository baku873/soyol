'use client';

import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';
import { useEffect, useState, useRef, useMemo } from 'react';
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

interface MobileFeaturedCarouselProps {
    products: Product[];
}

export default function MobileFeaturedCarousel({ products }: MobileFeaturedCarouselProps) {
    const { convertPrice, currency } = useLanguage();
    const { t } = useTranslation();
    const addItem = useCartStore((s) => s.addItem);

    // Prepare loop items with memoization to prevent re-renders
    const loopItems = useMemo(() => {
        const featured = products.filter((p) => p.featured || p.sections?.includes('Онцгой') || p.sections?.includes('Онцлох'));
        if (featured.length === 0) return [];

        // Ensure we have enough items to fill a reasonable width before duplication
        // For mobile/tablet, 6-8 items is usually enough to ensure no gaps
        let base = [...featured];
        while (base.length < 6) {
            base = [...base, ...featured];
        }
        return base;
    }, [products]);

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

    // Animation Logic
    const x = useMotionValue(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [itemWidth, setItemWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const momentumVelocity = useRef(0);
    const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Measure width for infinite scroll
    useEffect(() => {
        if (containerRef.current) {
            // We render 3 sets of items.
            // total scrollWidth = 3 * itemWidth
            const totalWidth = containerRef.current.scrollWidth;
            const singleSetWidth = totalWidth / 3;
            setItemWidth(singleSetWidth);

            // Initialize position at -itemWidth (showing Set 2)
            // This allows dragging left (to Set 3) and right (to Set 1)
            x.set(-singleSetWidth);
        }
    }, [loopItems, x]);

    // Resume logic
    const pause = () => {
        setIsPaused(true);
        if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current);
        }
    };

    const resume = () => {
        if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current);
        }
        resumeTimeoutRef.current = setTimeout(() => {
            setIsPaused(false);
        }, 3000); // 3 seconds delay
    };

    useAnimationFrame((t, delta) => {
        let currentX = x.get();
        let shouldUpdate = false;

        // 1. Custom Momentum Physics
        if (!isDragging && Math.abs(momentumVelocity.current) > 0.01) {
            // Apply friction
            momentumVelocity.current *= 0.95;
            currentX += momentumVelocity.current * delta;
            shouldUpdate = true;
        } else if (!isDragging && Math.abs(momentumVelocity.current) <= 0.01) {
            momentumVelocity.current = 0;
        }

        // 2. Auto-scroll logic
        // Only run if not paused, not dragging, and no active momentum
        if (!isPaused && !isDragging && momentumVelocity.current === 0) {
            // Fixed pixel speed for consistency (0.5px per frame approx)
            const speed = 0.5;
            currentX -= speed * (delta / 16);
            shouldUpdate = true;
        }

        // 3. Wrap logic (Only when NOT dragging to avoid fighting the gesture)
        if (!isDragging && itemWidth > 0) {
            // If we've scrolled past Set 2 into Set 3
            if (currentX <= -2 * itemWidth) {
                currentX += itemWidth;
                shouldUpdate = true;
            }
            // If we've scrolled back past Set 2 into Set 1
            else if (currentX >= 0) {
                currentX -= itemWidth;
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            x.set(currentX);
        }
    });

    const onDragStart = () => {
        setIsDragging(true);
        pause();
        momentumVelocity.current = 0;
    };

    const onDragEnd = (event: any, info: any) => {
        setIsDragging(false);
        resume();

        // Capture velocity from Framer (pixels per second)
        // Convert to pixels per ms for our loop
        const velocityPxPerMs = info.velocity.x / 1000;
        momentumVelocity.current = velocityPxPerMs;

        // Handle immediate wrap if drag released out of bounds
        const currentX = x.get();
        if (itemWidth > 0) {
            if (currentX <= -2 * itemWidth) {
                x.set(currentX + itemWidth);
            } else if (currentX >= 0) {
                x.set(currentX - itemWidth);
            }
        }
    };

    if (loopItems.length === 0) return null;

    // Render a single set of items
    const renderProductSet = (dataSet: Product[], setIndex: number) => (
        <div className="flex gap-3 pr-3 shrink-0">
            {dataSet.map((product, i) => {
                // Create unique key combining product ID, set index, and item index
                const uniqueKey = `${setIndex}-${product.id || product._id}-${i}`;

                return (
                    <div
                        key={uniqueKey}
                        className="flex-shrink-0 w-[160px] xs:w-[180px]"
                    >
                        <UniversalProductCard
                            product={product as any}
                            disableInitialAnimation={true}
                            index={i}
                        />
                    </div>
                );
            })}
        </div>
    );

    return (
        <section className="mb-6 lg:hidden">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 px-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        {t('home', 'featuredProducts')}
                    </h2>
                </div>
            </div>

            {/* Infinite Scroll Container */}
            <div
                className="relative w-full overflow-hidden"
                style={{
                    // Gradient Mask for Fade Effect
                    maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                }}
            >
                <motion.div
                    className="flex w-max cursor-grab active:cursor-grabbing"
                    style={{ x }}
                    drag="x"
                    dragMomentum={false}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onMouseEnter={pause}
                    onMouseLeave={resume}
                    onTouchStart={pause}
                    onTouchEnd={resume}
                    ref={containerRef}
                >
                    {/* Render three sets of items for seamless bi-directional looping */}
                    {renderProductSet(loopItems, 0)}
                    {renderProductSet(loopItems, 1)}
                    {renderProductSet(loopItems, 2)}
                </motion.div>
            </div>
        </section>
    );
}
