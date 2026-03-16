'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import Image from 'next/image';
import {
  Heart, Share2, Star, ShoppingBag, Truck,
  Clock, Minus, Plus, ArrowRight, ShieldCheck, Lock, Package, BadgeCheck,
  CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/AuthContext';
import RelatedProducts from './RelatedProducts';
import type { Product } from '@/models/Product';

export type ProductDetailData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice?: number;
  discount?: number;
  discountPercent?: number;
  image: string | null;
  images?: string[];
  category: string;
  stockStatus: string;
  inventory?: number;
  brand?: string;
  model?: string;
  delivery?: string;
  paymentMethods?: string;
  createdAt?: string;
  updatedAt?: string;
  wholesale?: boolean;
  sections?: string[];
  featured?: boolean;
  relatedProducts?: Product[];
  attributes?: Record<string, any>;
};

// ─────────────────────────────────────────────────────────────────────────────
// ANTIGRAVITY PHYSICS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function useAntigravity<T extends HTMLElement = HTMLDivElement>(
  maxX = 12, maxY = 8, lerpAmt = 0.04, decay = 0.72
) {
  const ref = useRef<T>(null);
  const position = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const isHovered = useRef(false);
  const rafId = useRef<number>();
  const isEnabled = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isCoarse || prefersReducedMotion) {
        isEnabled.current = false;
      }
    }
  }, []);

  const update = useCallback(() => {
    if (!isEnabled.current) return;
    if (!isHovered.current) {
      target.current.x *= decay;
      target.current.y *= decay;
    }
    position.current.x += (target.current.x - position.current.x) * lerpAmt;
    position.current.y += (target.current.y - position.current.y) * lerpAmt;
    if (ref.current) {
      ref.current.style.transform = `translate3d(${position.current.x}px,${position.current.y}px,0)`;
    }
    if (!isHovered.current && Math.abs(position.current.x) < 0.01 && Math.abs(position.current.y) < 0.01) {
      position.current.x = 0; position.current.y = 0;
      if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)';
      return;
    }
    rafId.current = requestAnimationFrame(update);
  }, [decay, lerpAmt]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEnabled.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
    target.current.x = dx * maxX;
    target.current.y = dy * maxY;
  };

  const handleMouseEnter = () => {
    if (!isEnabled.current) return;
    isHovered.current = true;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(update);
  };

  const handleMouseLeave = () => {
    if (!isEnabled.current) return;
    isHovered.current = false;
    target.current.x = 0; target.current.y = 0;
  };

  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);
  return { ref, handleMouseMove, handleMouseEnter, handleMouseLeave };
}

function useMagnetic(radius = 80, lerpAmt = 0.12, decay = 0.72) {
  const ref = useRef<HTMLButtonElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const isHovered = useRef(false);
  const rafId = useRef<number>();
  const isEnabled = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isCoarse || prefersReducedMotion) {
        isEnabled.current = false;
      }
    }
  }, []);

  const update = useCallback(() => {
    if (!isEnabled.current) return;
    if (!isHovered.current) { target.current.x *= decay; target.current.y *= decay; }
    position.current.x += (target.current.x - position.current.x) * lerpAmt;
    position.current.y += (target.current.y - position.current.y) * lerpAmt;
    if (ref.current) ref.current.style.transform = `translate3d(${position.current.x}px,${position.current.y}px,0)`;
    if (!isHovered.current && Math.abs(position.current.x) < 0.01 && Math.abs(position.current.y) < 0.01) {
      position.current.x = 0; position.current.y = 0;
      if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)';
      return;
    }
    rafId.current = requestAnimationFrame(update);
  }, [decay, lerpAmt]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isEnabled.current || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      if (dist < radius) {
        if (!isHovered.current) { isHovered.current = true; if (rafId.current) cancelAnimationFrame(rafId.current); rafId.current = requestAnimationFrame(update); }
        const s = 1 - dist / radius;
        target.current.x = (e.clientX - cx) * 0.4 * s;
        target.current.y = (e.clientY - cy) * 0.4 * s;
      } else if (isHovered.current) {
        isHovered.current = false; target.current.x = 0; target.current.y = 0;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [radius, update]);

  return { ref };
}

function useParallaxTilt(maxRotate = 4, perspective = 800, lerpAmt = 0.1, decay = 0.8) {
  const ref = useRef<HTMLDivElement>(null);
  const position = useRef({ rx: 0, ry: 0 });
  const target = useRef({ rx: 0, ry: 0 });
  const isHovered = useRef(false);
  const rafId = useRef<number>();
  const isEnabled = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isCoarse || prefersReducedMotion) {
        isEnabled.current = false;
      }
    }
  }, []);

  const update = useCallback(() => {
    if (!isEnabled.current) return;
    if (!isHovered.current) { target.current.rx *= decay; target.current.ry *= decay; }
    position.current.rx += (target.current.rx - position.current.rx) * lerpAmt;
    position.current.ry += (target.current.ry - position.current.ry) * lerpAmt;
    if (ref.current) ref.current.style.transform = `perspective(${perspective}px) rotateX(${position.current.rx}deg) rotateY(${position.current.ry}deg)`;
    if (!isHovered.current && Math.abs(position.current.rx) < 0.01 && Math.abs(position.current.ry) < 0.01) {
      position.current.rx = 0; position.current.ry = 0;
      if (ref.current) ref.current.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`;
      return;
    }
    rafId.current = requestAnimationFrame(update);
  }, [perspective, lerpAmt, decay]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEnabled.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
    target.current.rx = dy * -maxRotate;
    target.current.ry = dx * maxRotate;
  };

  const handleMouseEnter = () => {
    if (!isEnabled.current) return;
    isHovered.current = true;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(update);
  };

  const handleMouseLeave = () => {
    if (!isEnabled.current) return;
    isHovered.current = false; target.current.rx = 0; target.current.ry = 0;
  };

  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);
  return { ref, handleMouseMove, handleMouseEnter, handleMouseLeave };
}

function useFloatingOrb(lerpAmt = 0.035) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>();
  const isEnabled = useRef(true);
  const isActive = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isCoarse || prefersReducedMotion) {
        isEnabled.current = false;
      }
    }
  }, []);

  const update = useCallback(() => {
    if (!isEnabled.current) return;

    // Smoothly return to center when not active
    if (!isActive.current) {
      target.current.x *= 0.9;
      target.current.y *= 0.9;
    }

    position.current.x += (target.current.x - position.current.x) * lerpAmt;
    position.current.y += (target.current.y - position.current.y) * lerpAmt;

    if (ref.current) {
      ref.current.style.transform = `translate3d(${position.current.x}px,${position.current.y}px,0)`;
    }

    if (!isActive.current && Math.abs(position.current.x) < 0.5 && Math.abs(position.current.y) < 0.5) {
      if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)';
      return;
    }

    rafId.current = requestAnimationFrame(update);
  }, [lerpAmt]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isEnabled.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Check if mouse is near or inside container
      if (e.clientX >= rect.left - 200 && e.clientX <= rect.right + 200 &&
        e.clientY >= rect.top - 200 && e.clientY <= rect.bottom + 200) {
        if (!isActive.current) {
          isActive.current = true;
          if (rafId.current) cancelAnimationFrame(rafId.current);
          rafId.current = requestAnimationFrame(update);
        }
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const maxX = rect.width / 2 - 90, maxY = rect.height / 2 - 90;
        target.current.x = Math.max(-maxX, Math.min(maxX, e.clientX - cx));
        target.current.y = Math.max(-maxY, Math.min(maxY, e.clientY - cy));
      } else if (isActive.current) {
        isActive.current = false;
        target.current.x = 0;
        target.current.y = 0;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [update]);

  return { ref, containerRef };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductDetailClient({ product }: { product: ProductDetailData }) {
  const { isAuthenticated } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState<string | null>(null);

  const router = useRouter();
  const { addItem, toggleAllSelection } = useCartStore();
  const { t } = useTranslation();

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on('change', (y) => setIsScrolled(y > 300));
    return () => unsub();
  }, [scrollY]);

  useEffect(() => {
    if (product.stockStatus !== 'pre-order') return;
    fetch('/api/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName: product.name, stockStatus: product.stockStatus })
    })
      .then(r => r.json())
      .then(data => setDeliveryEstimate(data.estimation || null))
      .catch(() => null);
  }, [product.id, product.stockStatus]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/user/wishlist?productId=${product.id}`)
      .then(r => r.json())
      .then(data => setIsWishlisted(!!data.isWishlisted))
      .catch(() => null);
  }, [product.id, isAuthenticated]);

  const images: string[] = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : ['/placeholder-product.png'];

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const savings = product.originalPrice && product.originalPrice > product.price
    ? product.originalPrice - product.price
    : 0;

  // ── Handlers (all unchanged) ───────────────────────────────────────────────
  const handleWishlist = async () => {
    if (!isAuthenticated) return toast.error('Нэвтрэх шаардлагатай', { style: { borderRadius: '16px' } });
    const next = !isWishlisted;
    setIsWishlisted(next); // optimistic
    try {
      await fetch('/api/user/wishlist', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      toast.success(next ? 'Хүсэлд нэмсэн' : 'Хүслээс хассан');
    } catch {
      setIsWishlisted(!next); // rollback
      toast.error('Алдаа гарлаа');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url: window.location.href }); } catch { }
    } else {
      toast.success('Link copied to clipboard');
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        ...product,
        image: product.image || '',
        stockStatus: product.stockStatus as any,
        description: product.description || undefined,
      });
    }
    toast.custom((tInst) => (
      <div className={`${tInst.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4`}>
        <div className="flex items-start">
          <CheckCircle2 className="h-8 w-8 text-[#FF5000]" />
          <div className="ml-3">
            <p className="font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Сагсанд орлоо</p>
            <p className="mt-1 text-sm text-slate-500">{product.name}</p>
          </div>
        </div>
      </div>
    ));
  };

  const handleBuyNow = () => {
    toggleAllSelection(false);
    addItem({ ...product, image: product.image || '', stockStatus: product.stockStatus as any, description: product.description || undefined });
    router.push('/checkout');
  };

  // ── Physics hooks ──────────────────────────────────────────────────────────
  const mainImgPhysics = useAntigravity<HTMLDivElement>(12, 8, 0.04, 0.72);
  const minusPhysics = useAntigravity<HTMLButtonElement>(8, 8, 0.06, 0.7);
  const plusPhysics = useAntigravity<HTMLButtonElement>(8, 8, 0.06, 0.7);
  const magneticBuy = useMagnetic(80, 0.12, 0.72);
  const tilt = useParallaxTilt(4, 800);
  const orb = useFloatingOrb(0.035);

  return (
    <>
      {/* ── Font injection ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .font-sora { font-family: 'Sora', sans-serif; }
        .font-dm  { font-family: 'DM Sans', sans-serif; }
        body { background-color: #FAFAF9; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
      `}} />

      <div className="min-h-screen pb-[140px] md:pb-20 font-dm bg-[#FAFAF9] text-slate-600 overflow-hidden">

        {/* Mobile back button */} 
        <div 
          className="lg:hidden fixed top-0 left-0 z-[110] p-3" 
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }} 
        > 
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-md border border-slate-100/80" 
          > 
            <ChevronLeft className="w-5 h-5 text-slate-700" strokeWidth={2.5} /> 
          </motion.button> 
        </div> 

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {isScrolled && (
            <motion.div
              initial={{ y: -64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -64, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 left-0 right-0 z-[100] hidden md:block"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden border border-slate-100 bg-white shrink-0 relative">
                    <Image src={product.image || '/placeholder-product.png'} alt={product.name} fill className="object-contain p-1.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-1 max-w-xs">{product.name}</p>
                    <p className="font-sora font-bold text-[#FF5000] text-sm leading-none mt-0.5">{formatPrice(product.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddToCart}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-900 font-bold text-sm hover:bg-slate-200 transition-colors">
                    Сагсанд нэмэх
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleBuyNow}
                    className="px-5 py-2.5 rounded-2xl bg-[#FF5000] text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:bg-[#E64500] transition-colors">
                    Шууд авах
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 pt-0 pb-6 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

            {/* ── LEFT: GALLERY ───────────────────────────────────────────── */}
            <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-4">

              {/* Main image */}
              <div
                className="group relative w-full bg-white overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:shadow-sm md:aspect-square"
                style={{ aspectRatio: '1/1' }}
                onMouseMove={mainImgPhysics.handleMouseMove}
                onMouseEnter={mainImgPhysics.handleMouseEnter}
                onMouseLeave={mainImgPhysics.handleMouseLeave}
              >
                {/* Desktop fade image */}
                <div className="hidden md:block w-full h-full" onClick={() => setShowLightbox(true)}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="w-full h-full cursor-zoom-in absolute inset-0 flex items-center justify-center p-8"
                    >
                      <div ref={mainImgPhysics.ref} className="w-full h-full relative origin-center">
                        <Image src={images[activeImageIndex]} alt={product.name} fill className="object-contain pointer-events-none" priority />
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Desktop arrow nav */}
                  {images.length > 1 && (<>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveImageIndex(p => Math.max(0, p - 1)); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100 text-slate-600 hover:text-[#FF5000] disabled:opacity-30"
                      disabled={activeImageIndex === 0}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveImageIndex(p => Math.min(images.length - 1, p + 1)); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100 text-slate-600 hover:text-[#FF5000] disabled:opacity-30"
                      disabled={activeImageIndex === images.length - 1}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>)}
                </div>

                {/* Mobile swipe carousel */}
                <div className="md:hidden w-full h-full relative overflow-hidden" onClick={() => setShowLightbox(true)}>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -80 && activeImageIndex < images.length - 1) setActiveImageIndex(p => p + 1);
                      else if (info.offset.x > 80 && activeImageIndex > 0) setActiveImageIndex(p => p - 1);
                    }}
                    animate={{ x: `-${activeImageIndex * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex w-full h-full"
                  >
                    {images.map((img, i) => (
                      <div key={i} className="w-full h-full shrink-0 relative p-3 md:p-6">
                        <Image src={img} alt="" fill className="object-contain pointer-events-none" priority={i === 0} />
                      </div>
                    ))}
                  </motion.div>
                  {/* Dots */}
                  <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
                    {images.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeImageIndex === i ? 'w-6 bg-[#FF5000]' : 'w-2 bg-slate-300'}`} />
                    ))}
                  </div>
                  {/* Count badge */}
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {activeImageIndex + 1}/{images.length}
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-5 left-5 flex flex-col gap-2 z-10 select-none">
                  {product.stockStatus === 'in-stock' ? (
                    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 border border-emerald-100 rounded-2xl shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">БЭЛЭН</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 border border-amber-100 rounded-2xl shadow-sm">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">ЗАХИАЛГААР</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="px-3 py-1.5 bg-[#FF5000] text-white rounded-2xl shadow-lg shadow-orange-500/20 w-fit">
                      <span className="text-[10px] font-black uppercase tracking-widest">-{discount}% Off</span>
                    </div>
                  )}
                </div>

                {/* FABs */}
                <div className="absolute top-5 right-5 flex flex-col gap-2.5 z-10">
                  <motion.button whileTap={{ scale: 0.88 }} onClick={e => { e.stopPropagation(); handleWishlist(); }}
                    className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} strokeWidth={2} />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.88 }} onClick={e => { e.stopPropagation(); handleShare(); }}
                    className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 hover:text-blue-500 transition-colors">
                    <Share2 className="w-5 h-5" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="hidden md:flex gap-3 overflow-x-auto hide-scrollbar py-2 px-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setActiveImageIndex(i)}
                      onClick={() => setActiveImageIndex(i)}
                      className="relative shrink-0"
                    >
                      <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 transition-all duration-200 ${activeImageIndex === i
                        ? 'border-[#FF5000] shadow-[0_0_0_4px_rgba(255,80,0,0.1)]'
                        : 'border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200'
                        }`}>
                        <div className="w-full h-full relative p-1.5">
                          <Image src={img} alt="" fill className="object-contain" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Trust grid */}
              <div className="hidden md:grid grid-cols-3 gap-3 mt-2">
                {[
                  { icon: Truck, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-500', label: 'Шуурхай хүргэлт', sub: deliveryEstimate || product.delivery || 'Хот дотор үнэгүй' },
                  { icon: ShieldCheck, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-500', label: 'Баталгаат хугацаа', sub: '100% Оригинал' },
                  { icon: RotateCcw, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-500', label: 'Буцаалт хэвийн', sub: '7 хоногт буцаах' },
                ].map(({ icon: Icon, bg, text, label, sub }) => (
                  <div key={label} className="flex flex-col items-center justify-center bg-white p-5 rounded-3xl border border-slate-100 text-center gap-2">
                    <div className={`w-10 h-10 ${bg} ${text} rounded-full flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-900 text-[13px] leading-tight">{label}</span>
                    <span className="text-xs text-slate-400">{sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: INFO PANEL ────────────────────────────────────────── */}
            <div ref={orb.containerRef} className="lg:col-span-6 xl:col-span-5 relative md:mt-0 -mt-6">

              {/* Floating orb */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-[3rem] hidden md:block" style={{ margin: '-2rem' }}>
                <div
                  ref={orb.ref}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-3xl rounded-full"
                  style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(255,80,0,0.15) 0%, transparent 70%)' }}
                />
              </div>

              <div className="relative z-10 flex flex-col gap-5 bg-white md:bg-transparent rounded-t-[2rem] md:rounded-none px-5 md:px-0 pt-6 md:pt-0 shadow-[0_-8px_40px_rgba(0,0,0,0.07)] md:shadow-none">

                {/* Brand & rating row */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <Link href={`/store/${product.category}`}
                    className="flex items-center gap-1.5 text-[#FF5000] font-bold text-xs tracking-widest bg-orange-50 px-3.5 py-1.5 rounded-full hover:bg-orange-100 transition-colors uppercase border border-orange-100">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {product.brand || product.category}
                  </Link>
                </div>

                {/* Title */}
                <h1 className="font-sora font-bold text-[22px] md:text-4xl text-slate-900 leading-[1.2] tracking-tight">
                  {product.name}
                </h1>

                {/* Price card with parallax tilt */}
                <div
                  className="bg-[#FFF8F5] md:bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-orange-100 shadow-sm relative overflow-hidden"
                  onMouseMove={tilt.handleMouseMove}
                  onMouseEnter={tilt.handleMouseEnter}
                  onMouseLeave={tilt.handleMouseLeave}
                >
                  <div ref={tilt.ref} className="origin-center bg-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Үнэ</p>

                    {/* Price row */}
                    <div className="flex items-end gap-4 flex-wrap">
                      <span className="font-sora font-extrabold text-[32px] md:text-4xl lg:text-5xl text-[#FF5000] tracking-tighter leading-none">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg font-bold text-slate-300 line-through decoration-slate-300 leading-none mb-0.5">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Savings badge + stock status */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {savings > 0 && (
                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-100">
                          {formatPrice(savings)} хэмнэлт · {discount}%
                        </div>
                      )}
                      {/* Stock pulse */}
                      <div className="flex items-center gap-1.5">
                        <div className={`relative w-2 h-2 rounded-full ${product.stockStatus === 'in-stock' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          <div className={`absolute inset-0 rounded-full animate-ping ${product.stockStatus === 'in-stock' ? 'bg-emerald-500' : 'bg-amber-500'} opacity-60`} />
                        </div>
                        <span className={`text-xs font-bold ${product.stockStatus === 'in-stock' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {product.stockStatus === 'in-stock' ? 'Бэлэн байгаа' : 'Захиалгаар'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Short description */}
                <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3">
                  {product.description || 'Дээд зэргийн чанартай, албан ёсны эрхтэй борлуулагдаж буй бүтээгдэхүүн. Орчин үеийн загвар, онцгой шийдэл.'}
                </p>

                {/* Spec pills */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 md:flex-wrap">
                  {product.brand && (
                    <span className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-100 shadow-sm shrink-0">
                      🏷️ {product.brand}
                    </span>
                  )}
                  {product.model && (
                    <span className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-100 shadow-sm shrink-0">
                      📱 {product.model}
                    </span>
                  )}
                  <span className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-100 shadow-sm shrink-0">
                    📦 {product.delivery || 'Хэвийн хүргэлт'}
                  </span>
                  <span className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-100 shadow-sm shrink-0">
                    💳 QPay · SocialPay
                  </span>
                </div>

                <hr className="border-slate-100" />

                {/* Quantity & CTA */}
                <div className="space-y-4">
                  {/* Quantity */}
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-900 text-sm">Тоо хэмжээ:</span>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                      <div
                        onMouseMove={minusPhysics.handleMouseMove}
                        onMouseEnter={minusPhysics.handleMouseEnter}
                        onMouseLeave={minusPhysics.handleMouseLeave}
                      >
                        <motion.button
                          ref={minusPhysics.ref}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-[#FF5000] hover:bg-orange-50 transition-colors"
                        >
                          <Minus className="w-4 h-4" strokeWidth={3} />
                        </motion.button>
                      </div>
                      <span className="w-8 text-center font-sora font-bold text-lg text-slate-900">{quantity}</span>
                      <div
                        onMouseMove={plusPhysics.handleMouseMove}
                        onMouseEnter={plusPhysics.handleMouseEnter}
                        onMouseLeave={plusPhysics.handleMouseLeave}
                      >
                        <motion.button
                          ref={plusPhysics.ref}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setQuantity(Math.min(product.inventory ?? 10, quantity + 1))}
                          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-[#FF5000] hover:bg-orange-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" strokeWidth={3} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop CTAs */}
                  <div className="hidden md:grid grid-cols-2 gap-3 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAddToCart}
                      className="py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 font-bold hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" strokeWidth={2} />
                      Сагсанд нэмэх
                    </motion.button>

                    <button
                      ref={magneticBuy.ref}
                      onClick={handleBuyNow}
                      className="py-4 rounded-2xl bg-[#FF5000] text-white font-bold shadow-[0_12px_30px_rgba(255,80,0,0.28)] hover:bg-[#E64500] transition-colors flex items-center justify-center gap-2"
                    >
                      Шууд авах
                      <ArrowRight className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Security row */}
                  <div className="hidden md:flex justify-center gap-6">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      <Lock className="w-3 h-3" />Аюулгүй гүйлгээ
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      <ShieldCheck className="w-3 h-3" />Баталгаат
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      <Package className="w-3 h-3" />Хайрцагт
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABS ──────────────────────────────────────────────────────── */}
          <div className="mt-16 md:mt-24">
            <ProductInfoTabs product={product} />
          </div>

          {/* ── RELATED ───────────────────────────────────────────────────── */}
          <div className="mt-8 md:mt-24 px-4 md:px-0">
            <h2 className="font-sora font-bold text-xl md:text-3xl text-slate-900 mb-5 md:mb-8 border-l-4 border-[#FF5000] pl-4">
              Төстэй бараа
            </h2>
            <RelatedProducts products={product.relatedProducts || []} />
          </div>
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="relative w-full max-w-5xl aspect-square md:aspect-video rounded-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <Image src={images[activeImageIndex]} alt="" fill className="object-contain" priority />
              {images.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveImageIndex(p => Math.max(0, p - 1)); }}
                    disabled={activeImageIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveImageIndex(p => Math.min(images.length - 1, p + 1)); }}
                    disabled={activeImageIndex === images.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={e => { e.stopPropagation(); setActiveImageIndex(i); }}
                        className={`h-1.5 rounded-full transition-all ${i === activeImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom CTA ─────────────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-[60] md:hidden"
        style={{ bottom: '56px', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 px-4 pt-3 pb-4">
          {/* Price */}
          <div className="flex flex-col justify-center min-w-0 mr-auto">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
              Нийт үнэ
            </span>
            <span className="font-sora font-extrabold text-[18px] text-[#FF5000] leading-none truncate">
              {formatPrice(product.price * quantity)}
            </span>
            {quantity > 1 && (
              <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                {quantity}ш × {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Сагслах */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleAddToCart}
            className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-900 font-bold text-sm active:bg-slate-200 transition-colors shrink-0"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={2} />
            Сагслах
          </motion.button>

          {/* Худалдан авах */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleBuyNow}
            className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl bg-[#FF5000] text-white font-bold text-sm shadow-lg shadow-orange-500/30 active:bg-[#E64500] transition-colors shrink-0"
          >
            Авах
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ProductInfoTabs({ product }: { product: any }) {
  const tabs = [
    { id: 'description', label: 'Тайлбар' },
    { id: 'specs', label: 'Үзүүлэлт' },
    { id: 'reviews', label: `Үнэлгээ${product.reviewCount ? ` (${product.reviewCount})` : ''}` },
  ];
  const [activeTab, setActiveTab] = useState('description');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; distribution: Record<number, number>; total: number } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'reviews') return;
    setReviewsLoading(true);
    fetch(`/api/reviews?productId=${product.id}&limit=5`)
      .then(r => r.json())
      .then(data => {
        setReviews(data.reviews || []);
        setReviewStats({
          averageRating: data.averageRating || 0,
          distribution: data.distribution || {},
          total: data.total || 0,
        });
      })
      .finally(() => setReviewsLoading(false));
  }, [activeTab, product.id]);

  return (
    <div className="bg-white rounded-3xl p-4 md:p-10 shadow-sm border border-slate-100 font-dm">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 md:px-5 md:py-4 text-sm font-bold relative transition-colors ${activeTab === tab.id ? 'text-[#FF5000]' : 'text-slate-400 hover:text-slate-700'}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tabUnderline"
                className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#FF5000] rounded-t-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-8"
        >
          {/* Description */}
          {activeTab === 'description' && (
            <div className="prose prose-sm text-slate-600 max-w-none">
              <p className="leading-relaxed font-medium text-base">
                {product.description || 'Дэлгэрэнгүй мэдээлэл ороогүй байна.'}
              </p>
            </div>
          )}

          {/* Specs */}
          {activeTab === 'specs' && (
            <div className="divide-y divide-slate-50">
              {product.attributes && Object.keys(product.attributes).length > 0 ? (
                Object.entries(product.attributes).map(([k, v], i) => (
                  <div key={k} className={`flex py-3.5 ${i % 2 === 0 ? 'bg-slate-50/50 -mx-6 px-6' : ''}`}>
                    <span className="w-2/5 font-bold text-slate-400 text-sm">{k}</span>
                    <span className="w-3/5 font-bold text-slate-900 text-sm">{String(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 font-medium italic py-4">Үзүүлэлтийн мэдээлэл байхгүй байна.</p>
              )}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="flex flex-col lg:flex-row gap-12 py-4">
              <div className="shrink-0 text-center lg:text-left">
                <div className="font-sora font-black text-6xl text-slate-900 tracking-tighter leading-none mb-3">
                  {reviewStats?.averageRating.toFixed(1) || '0.0'}
                </div>
                <div className="flex justify-center lg:justify-start gap-1 text-amber-500 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${s <= Math.round(reviewStats?.averageRating || 0) ? 'fill-current' : 'text-slate-200 fill-slate-200'}`}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-slate-400">Нийт {reviewStats?.total || 0} үнэлгээ</p>
              </div>

              <div className="flex-1 space-y-3">
                {reviewsLoading && <div className="py-8 text-center text-slate-400 text-sm">Уншиж байна...</div>}

                {!reviewsLoading && [5, 4, 3, 2, 1].map((star, idx) => {
                  const widthPct = reviewStats?.total
                    ? Math.round(((reviewStats.distribution[star] || 0) / reviewStats.total) * 100)
                    : 0;
                  return (
                    <div key={star} className="flex items-center gap-4">
                      <span className="font-bold text-slate-600 w-3 text-sm">{star}</span>
                      <Star className="w-4 h-4 fill-slate-200 text-slate-200 shrink-0" />
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.9, delay: idx * 0.08, ease: 'easeOut' }}
                          className="h-full bg-amber-400 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right font-bold">{widthPct}%</span>
                    </div>
                  );
                })}

                {/* Review List */}
                {!reviewsLoading && reviews.length > 0 && (
                  <div className="mt-8 space-y-5 border-t border-slate-100 pt-6">
                    {reviews.map((r: any) => (
                      <div key={r._id} className="flex gap-4">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-500 text-sm">
                          {r.userName?.[0] || 'А'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 text-sm">{r.userName || 'Нэргүй'}</span>
                            {r.verified && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">✓ Баталгаат</span>}
                          </div>
                          <div className="flex gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                            ))}
                          </div>
                          {r.comment && <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>}
                          <p className="text-xs text-slate-400 mt-2">{new Date(r.createdAt).toLocaleDateString('mn-MN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-6">
                  <button className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors text-sm">
                    Үнэлгээ бичих
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
