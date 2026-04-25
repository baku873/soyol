"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Clock } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../lib/utils";
import toast from "react-hot-toast";
import { Product } from "@/types/Product";
import ProductBadge from "../components/ProductBadge";

interface UniversalProductCardProps {
  product: Product;
  index?: number;
  disableInitialAnimation?: boolean;
  statusBadgeMode?: "default" | "ready" | "preorder" | "new" | "sale";
  isAdmin?: boolean;
}

export default function UniversalProductCard({
  product: originalProduct,
  index = 0,
  disableInitialAnimation = false,
  statusBadgeMode = "default",
  isAdmin = false,
}: UniversalProductCardProps) {
  const router = useRouter();
  const product = originalProduct;

  const { isAuthenticated } = useAuth();
  const addItem = useCartStore((state) => state.addItem);
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const isWishlisted = isInWishlist(product.id);

  const [activeIdx, setActiveIdx] = useState(0);
  const isDragging = useRef(false);

  const allImages: string[] = (() => {
    const combined: string[] = [];
    if (product.image) combined.push(product.image);
    if (product.images?.length) {
      product.images.forEach((img) => {
        if (!combined.includes(img)) combined.push(img);
      });
    }
    return combined.length > 0 ? combined : ["/soyol-logo.png"];
  })();

  const hasMultiple = allImages.length > 1;

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) *
        100,
      )
      : (product.discountPercent ?? 0);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product as any);
    toast.success("Сагсанд нэмлээ", {
      style: {
        borderRadius: "10px",
        background: "#FF5000",
        color: "#fff",
        fontWeight: "600",
      },
      duration: 1500,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Нэвтрэх шаардлагатай", { style: { borderRadius: "10px" } });
      return;
    }
    if (isWishlisted) {
      removeFromWishlist(product.id);
      toast.success("Хүслээс хассан", { style: { borderRadius: "10px" } });
    } else {
      addToWishlist({ ...product } as any);
      toast.success("Хүсэлд нэмсэн", { style: { borderRadius: "10px" } });
    }
  };

  return (
    <motion.div
      initial={disableInitialAnimation ? undefined : { opacity: 0, y: 16 }}
      whileInView={disableInitialAnimation ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        disableInitialAnimation
          ? undefined
          : { duration: 0.4, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }
      }
      whileTap={{ scale: 0.97 }}
      className="group relative"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="block cursor-pointer"
        onClick={(e) => {
          if (!isDragging.current) {
            router.push(`/product/${product.id}`);
          }
        }}
      >
        <div className="bg-white rounded-[20px] sm:rounded-[2rem] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1">
          {/* ── Image area ─────────────────────────────── */}
          <div className="relative aspect-square bg-[#F7F7F5] overflow-hidden rounded-t-[20px] sm:rounded-t-[2rem]">
            {/* Swipeable image slider */}
            {hasMultiple ? (
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragStart={() => {
                  isDragging.current = true;
                }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 50) {
                    if (info.offset.x < 0 && activeIdx < allImages.length - 1)
                      setActiveIdx((p) => p + 1);
                    else if (info.offset.x > 0 && activeIdx > 0)
                      setActiveIdx((p) => p - 1);
                  }
                  setTimeout(() => {
                    isDragging.current = false;
                  }, 10);
                }}
                animate={{ x: `-${activeIdx * 100}%` }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="flex w-full h-full"
              >
                {allImages.map((img, i) => (
                  <div key={i} className="w-full h-full shrink-0 relative">
                    <Image
                      src={img}
                      alt={product.name}
                      fill
                      className="object-cover sm:object-contain sm:p-6 pointer-events-none transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority={i === 0 && index < 4}
                    />
                  </div>
                ))}
              </motion.div>
            ) : (
              <Image
                src={allImages[0]}
                alt={product.name}
                fill
                className="object-cover sm:object-contain sm:p-6 transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={index < 4}
              />
            )}

            {/* ── Top-left badges ───────────────────────── */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
              {/* Ready Badge */}
              {(statusBadgeMode === "ready" ||
                (statusBadgeMode === "default" && (
                  product.sections?.includes("Бэлэн") ||
                  (!product.sections?.includes("Захиалга") && product.stockStatus === "in-stock")
                ))) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#34C759] uppercase tracking-wider leading-none mt-[1px]">
                      Бэлэн
                    </span>
                  </div>
                )}

              {/* Order Badge */}
              {(statusBadgeMode === "preorder" ||
                (statusBadgeMode === "default" && (
                  product.sections?.includes("Захиалга") ||
                  (!product.sections?.includes("Бэлэн") && product.stockStatus === "pre-order")
                ))) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <Clock className="w-3 h-3 text-[#FF9500]" strokeWidth={2.5} />
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#FF9500] uppercase tracking-wider leading-none mt-[1px]">
                      Захиалга
                    </span>
                  </div>
                )}

              {statusBadgeMode === "new" &&
                (() => {
                  if (!product.createdAt) return true;
                  const d = new Date(product.createdAt as any);
                  if (Number.isNaN(d.getTime())) return true;
                  return Date.now() - d.getTime() <= 24 * 60 * 60 * 1000;
                })() && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <span className="text-[11px] leading-none">✨</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#007AFF] uppercase tracking-wider leading-none mt-[1px]">
                    Шинэ
                  </span>
                </div>
              )}

              {statusBadgeMode === "sale" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <span className="text-[11px] leading-none">🏷️</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#FF3B30] uppercase tracking-wider leading-none mt-[1px]">
                    Хямдрал
                  </span>
                </div>
              )}

              {/* Featured / New badge from product metadata (only in default mode to avoid conflict) */}
              {statusBadgeMode === "default" && (
                <ProductBadge
                  isFeatured={
                    product.featured ||
                    product.sections?.includes("Онцгой") ||
                    product.sections?.includes("Онцлох")
                  }
                  sections={product.sections}
                  createdAt={product.createdAt}
                />
              )}
            </div>

            {/* ── Wishlist button ───────────────────────── */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleWishlist}
              className={`absolute top-3 right-3 z-10 flex items-center justify-center transition-all w-6 h-6 sm:w-9 sm:h-9 sm:rounded-full sm:border ${isWishlisted
                ? "text-[#FF5722] sm:bg-red-50 sm:border-red-100 sm:text-red-500"
                : "text-[#AAAAAA] sm:bg-white/90 sm:backdrop-blur-sm sm:border-black/[0.04] sm:text-black/30 hover:text-[#FF5722] sm:hover:text-red-500 sm:shadow-sm"
                }`}
            >
              {/* Mobile Heart */}
              <Heart
                className={`sm:hidden w-5 h-5 ${isWishlisted ? "fill-[#FF5722] stroke-[#FF5722]" : "fill-transparent stroke-[#AAAAAA]"}`}
                strokeWidth={1}
              />
              {/* Desktop Heart */}
              <Heart
                className={`hidden sm:block w-4 h-4 ${isWishlisted ? "fill-red-500" : ""}`}
                strokeWidth={2.5}
              />
            </motion.button>
          </div>

          {/* ── Info area ──────────────────────────────── */}
          <div className="px-3.5 pt-3 pb-3.5 sm:px-5 sm:pt-5 sm:pb-5 flex flex-col gap-2.5 sm:gap-4">
            {/* Product name */}
            <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#1C1C1E] leading-snug line-clamp-2 min-h-[42px] sm:min-h-[48px] tracking-tight group-hover:text-[#FF5000] transition-colors">
              {product.name} {product.isCargo && " + Карго"}
            </h3>

            {/* Footer Container (Pushed to bottom) */}
            <div className="mt-auto flex flex-col gap-2.5 sm:gap-4">
              {/* Inventory Level (Visible only for low stock <= 10) */}
              {product.inventory !== undefined &&
                product.inventory <= 10 &&
                product.inventory > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 leading-none">
                      Сүүлийн {product.inventory} ширхэг
                    </span>
                    <div className="w-full h-1 bg-[#E5E5EA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF3B30] rounded-full"
                        style={{ width: `${(product.inventory / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

              {/* Desktop: Price section separate */}
              <div className="hidden sm:flex flex-col gap-0.5">
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-[11px] sm:text-xs text-gray-400 line-through font-medium leading-none">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                <div className="flex items-baseline gap-1">
                  <span className="text-[18px] sm:text-2xl font-bold text-[#FF5000] leading-none tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* Desktop: Footer buttons row */}
              <div className="hidden sm:flex items-center gap-2">
                {isAdmin ? (
                  <Link
                    href={`/admin/products/${product.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden lg:flex flex-1 items-center justify-center py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider hover:bg-amber-500 hover:text-white hover:shadow-lg transition-all duration-300"
                  >
                    Засах
                  </Link>
                ) : (
                  <div className="hidden lg:flex flex-1 items-center justify-center py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 font-bold text-xs uppercase tracking-wider group-hover:bg-gray-900 group-hover:text-white group-hover:shadow-lg transition-all duration-300">
                    Дэлгэрэнгүй
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddToCart}
                  className="lg:w-11 lg:h-11 w-10 h-10 flex items-center justify-center bg-[#FF5000] text-white rounded-[14px] shadow-[0_4px_12px_rgba(255,80,0,0.3)] active:bg-[#E64800] transition-all shrink-0"
                >
                  <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
                </motion.button>
              </div>

              {/* Mobile: Footer row (Price & Cart Button merged) */}
              <div className="flex sm:hidden items-center justify-between gap-2 mt-1">
                <div className="flex flex-col">
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <span className="text-[11px] text-gray-400 line-through font-medium leading-none mb-1">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  <span className="text-[17px] font-bold text-[#FF5000] leading-none tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToCart}
                    className="w-[34px] h-[34px] flex items-center justify-center bg-[#FF5000] text-white rounded-[12px] shadow-[0_4px_12px_rgba(255,80,0,0.3)] active:bg-[#E64800] transition-all shrink-0"
                  >
                    <ShoppingCart
                      className="w-[18px] h-[18px]"
                      strokeWidth={2.5}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

