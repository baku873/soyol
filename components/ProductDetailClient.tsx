"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  X,
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  Share2,
  Clock,
  FileText,
  List,
  Check,
} from "lucide-react";
import useSWR from "swr";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../lib/utils";
import { Product } from "../models/Product";
import { useCartStore } from "../store/cartStore";
import toast from "react-hot-toast";
import { useTranslation } from "../hooks/useTranslation";
import RelatedProducts from "./RelatedProducts";
import ProductReviews from "./ProductReviews";
import { openExternalLink } from "../lib/openExternalLink";

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
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  brand?: string;
  model?: string;
  delivery?: string;
  paymentMethods?: string;
  createdAt?: string;
  updatedAt?: string;
  sections?: string[];
  featured?: boolean;
  isCargo?: boolean;
  relatedProducts?: Product[];
  attributes?: Record<string, any>;
  reviews?: any[];
  options?: any[];
  variants?: any[];
  subcategory?: string;
  deliveryFee?: number;
};

export default function ProductDetailClient({
  product,
  initialReviews,
}: {
  product: ProductDetailData;
  initialReviews: any[];
}) {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { data: categoriesData } = useSWR("/api/categories", (url) =>
    fetch(url).then((r) => r.json()),
  );
  const categories = categoriesData?.categories || [];
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">(
    "desc",
  );
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (product.options?.length) {
      const initial: Record<string, string> = {};
      product.options.forEach((opt: any) => {
        if (opt.values.length === 1) initial[opt.name] = opt.values[0];
      });
      if (Object.keys(initial).length > 0) {
        setSelectedOptions((prev) => ({ ...prev, ...initial }));
      }
    }
  }, [product.options]);

  const selectedVariant = useMemo(() => {
    if (!product.variants?.length) return null;
    return (
      product.variants.find((v: any) =>
        product.options?.every(
          (opt: any) => v.options[opt.name] === selectedOptions[opt.name],
        ),
      ) || null
    );
  }, [selectedOptions, product.variants, product.options]);

  const displayPrice = selectedVariant?.price || product.price;
  const displayInventory = selectedVariant
    ? selectedVariant.inventory
    : (product.inventory ?? 0);
  const isOutOfStock = product.options?.length
    ? !selectedVariant || displayInventory <= 0
    : displayInventory <= 0;

  const canAddToCart =
    !isOutOfStock &&
    (!product.options?.length ||
      (product.options.every((o: any) => selectedOptions[o.name]) &&
        selectedVariant &&
        selectedVariant.inventory > 0));

  const { addItem, toggleAllSelection } = useCartStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/user/wishlist?productId=${product.id}`)
      .then((r) => r.json())
      .then((data) => setIsWishlisted(!!data.isWishlisted))
      .catch(() => null);
  }, [product.id, isAuthenticated]);

  const images: string[] = (() => {
    const combined: string[] = [];
    if (product.image) combined.push(product.image);
    if (product.images?.length) {
      product.images.forEach((img) => {
        if (!combined.includes(img)) combined.push(img);
      });
    }
    return combined.length > 0 ? combined : ["/placeholder-product.png"];
  })();

  const discount =
    product.originalPrice && product.originalPrice > displayPrice
      ? Math.round(
        ((product.originalPrice - displayPrice) / product.originalPrice) *
        100,
      )
      : 0;

  const categoryObj = categories.find((c: any) => c.id === product.category);
  const categoryName = categoryObj ? categoryObj.name : product.category;

  const handleWishlist = async () => {
    if (!isAuthenticated)
      return toast.error("Нэвтрэх шаардлагатай", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
    const next = !isWishlisted;
    setIsWishlisted(next);
    try {
      await fetch("/api/user/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      toast.success(next ? "Хүсэлд нэмсэн" : "Хүслээс хассан", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
    } catch {
      setIsWishlisted(!next);
      toast.error("Алдаа гарлаа");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          url: window.location.href,
        });
      } catch { }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Холбоос хуулагдлаа", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
    }
  };

  const handleAddToCart = () => {
    if (
      product.options?.length &&
      !product.options.every((o: any) => selectedOptions[o.name])
    ) {
      toast.error("Сонголтуудаа гүйцэд сонгоно уу", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
      return;
    }
    if (isOutOfStock) {
      toast.error("Үлдэгдэл хүрэлцэхгүй байна", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
      return;
    }
    addItem(
      {
        ...product,
        image: product.image || "",
        stockStatus: product.stockStatus as any,
        description: product.description || undefined,
        price: displayPrice,
        variantId: selectedVariant?.id,
        selectedOptions: product.options?.length ? selectedOptions : undefined,
      } as any,
      quantity,
      false,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    toast.success("Сагсанд нэмлээ", {
      style: {
        borderRadius: "8px",
        background: "#FF5000",
        color: "#fff",
        fontFamily: "inherit",
        fontWeight: "600",
      },
    });
  };

  const handleBuyNow = async () => {
    if (
      product.options?.length &&
      !product.options.every((o: any) => selectedOptions[o.name])
    ) {
      toast.error("Сонголтуудаа гүйцэд сонгоно уу", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
      return;
    }
    if (isOutOfStock) {
      toast.error("Үлдэгдэл хүрэлцэхгүй байна", {
        style: { borderRadius: "8px", fontFamily: "inherit" },
      });
      return;
    }
    toggleAllSelection(false);
    await addItem(
      {
        ...product,
        image: product.image || "",
        stockStatus: product.stockStatus as any,
        description: product.description || undefined,
        price: displayPrice,
        variantId: selectedVariant?.id,
        selectedOptions: product.options?.length ? selectedOptions : undefined,
      } as any,
      quantity,
      true,
    );
    router.push("/checkout");
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          .pd-root { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; }
          .pd-root * { box-sizing: border-box; }
          .hide-sb::-webkit-scrollbar { display: none; }
          .hide-sb { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes pd-check { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
          .pd-check-anim { animation: pd-check 0.3s ease forwards; }
        `,
        }}
      />
      <div className="pd-root min-h-screen bg-[#F6F6F4] pb-[120px] md:pb-16">
        {/* Mobile top bar */}
        <div
          className="lg:hidden fixed top-0 left-0 right-0 z-[110] flex items-center justify-between px-4 bg-[#F6F6F4]"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
            paddingBottom: "12px",
          }}
        >
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-black/[0.06] shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-black" strokeWidth={2.5} />
          </motion.button>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-black/[0.06] shadow-sm"
            >
              <Share2 className="w-4 h-4 text-black" strokeWidth={2} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleWishlist}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-black/[0.06] shadow-sm"
            >
              <Heart
                className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : "text-black"}`}
                strokeWidth={2}
              />
            </motion.button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:gap-10 lg:pt-10 lg:px-8">
            {/* Image section */}
            <div className="lg:w-[52%] lg:sticky lg:top-10 lg:self-start">
              {/* ... (image section unchanged - keeping original for brevity) ... */}
              <div
                className="relative bg-white overflow-hidden lg:rounded-2xl"
                style={{ aspectRatio: "1/1" }}
              >
                {/* Mobile swipe image */}
                <div className="md:hidden w-full h-full relative overflow-hidden">
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.08}
                    onDragEnd={(_, info) => {
                      if (
                        info.offset.x < -60 &&
                        activeImageIndex < images.length - 1
                      )
                        setActiveImageIndex((p) => p + 1);
                      else if (info.offset.x > 60 && activeImageIndex > 0)
                        setActiveImageIndex((p) => p - 1);
                    }}
                    animate={{ x: `-${activeImageIndex * 100}%` }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    className="flex w-full h-full"
                  >
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="w-full h-full shrink-0 relative p-6"
                      >
                        <Image
                          src={img}
                          alt={product.name}
                          fill
                          className="object-contain pointer-events-none"
                          priority={i === 0}
                        />
                      </div>
                    ))}
                  </motion.div>
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {images.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-all duration-300 ${activeImageIndex === i ? "w-5 bg-black" : "w-1 bg-black/20"}`}
                        />
                      ))}
                    </div>
                  )}
                  {images.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full tracking-wide">
                      {activeImageIndex + 1}/{images.length}
                    </div>
                  )}
                </div>

                {/* Desktop image with lightbox */}
                <div
                  className="hidden md:block w-full h-full cursor-zoom-in"
                  onClick={() => setShowLightbox(true)}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-full h-full relative p-8"
                    >
                      <Image
                        src={images[activeImageIndex]}
                        alt={product.name}
                        fill
                        className="object-contain pointer-events-none"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((p) => Math.max(0, p - 1));
                        }}
                        disabled={activeImageIndex === 0}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow border border-black/[0.06] disabled:opacity-30 hover:shadow-md transition-shadow"
                      >
                        <ChevronLeft className="w-4 h-4 text-black" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((p) =>
                            Math.min(images.length - 1, p + 1),
                          );
                        }}
                        disabled={activeImageIndex === images.length - 1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow border border-black/[0.06] disabled:opacity-30 hover:shadow-md transition-shadow"
                      >
                        <ChevronRight className="w-4 h-4 text-black" />
                      </button>
                    </>
                  )}
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.sections?.includes("Бэлэн") && (
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-black/[0.06] shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-700 tracking-wide uppercase">
                        Бэлэн
                      </span>
                    </div>
                  )}
                  {product.sections?.includes("Захиалга") && (
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-black/[0.06] shadow-sm">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-700 tracking-wide uppercase">
                        Захиалга
                      </span>
                    </div>
                  )}
                  {!product.sections?.includes("Бэлэн") &&
                    !product.sections?.includes("Захиалга") && (
                      <>
                        {product.stockStatus === "in-stock" && (
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-black/[0.06] shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-semibold text-emerald-700 tracking-wide uppercase">
                              Бэлэн
                            </span>
                          </div>
                        )}
                        {product.stockStatus === "pre-order" && (
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-black/[0.06] shadow-sm">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-700 tracking-wide uppercase">
                              Захиалга
                            </span>
                          </div>
                        )}
                      </>
                    )}
                </div>

                {/* Desktop share + wishlist */}
                <div className="hidden md:flex absolute bottom-4 right-4 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-black/[0.06] shadow-sm hover:shadow transition-shadow"
                  >
                    <Share2 className="w-4 h-4 text-black/60" strokeWidth={2} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleWishlist}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-black/[0.06] shadow-sm hover:shadow transition-shadow"
                  >
                    <Heart
                      className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : "text-black/60"}`}
                      strokeWidth={2}
                    />
                  </motion.button>
                </div>
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="hidden md:flex gap-2 mt-3 overflow-x-auto hide-sb">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      onMouseEnter={() => setActiveImageIndex(i)}
                      className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-150 bg-white ${activeImageIndex === i ? "border-black opacity-100" : "border-transparent opacity-40 hover:opacity-70"}`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-contain p-1.5"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details section */}
            <div className="lg:w-[48%] flex flex-col">
              <div className="bg-white lg:rounded-2xl px-5 py-6 lg:p-8">
                {/* ... (all the product info, options, quantity, buttons, trust badges - unchanged) ... */}
                <p className="text-[11px] text-black/30 font-medium tracking-wide uppercase mb-3">
                  {categoryName}
                  {product.brand && <span> · {product.brand}</span>}
                </p>
                <h1 className="text-[18px] lg:text-[20px] font-semibold text-black leading-snug mb-4 tracking-tight">
                  {product.name} {product.isCargo && " + Карго"}
                </h1>
                <div className="mb-6 pb-6 border-b border-black/[0.06]">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[28px] font-bold text-black tracking-tight leading-none">
                      {formatPrice(displayPrice * quantity)}
                    </span>
                    {product.originalPrice &&
                      product.originalPrice > displayPrice && (
                        <span className="text-sm text-black/30 line-through font-medium">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    {quantity > 1 && (
                      <span className="text-xs text-black/40 font-medium">
                        {quantity}ш × {formatPrice(displayPrice)}
                      </span>
                    )}
                  </div>
                  {product.isCargo && (
                    <div className="mt-2 text-[#FF5000] text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5000] animate-pulse" />
                      <span>📦 Карго бараа - Хүргэлт тусдаа тооцогдоно</span>
                    </div>
                  )}
                </div>

                {/* Options */}
                {product.options && product.options.length > 0 && (
                  <div className="flex flex-col gap-5 mb-6 pb-6 border-b border-black/[0.06]">
                    {product.options.map((option: any) => (
                      <div key={option.id}>
                        <p className="text-[11px] font-semibold text-black/40 uppercase tracking-widest mb-2.5">
                          {option.name}
                          {selectedOptions[option.name] && (
                            <span className="text-black/60 ml-2 normal-case tracking-normal font-medium text-[12px]">
                              {selectedOptions[option.name]}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {option.values.map((val: any) => {
                            const isSelected =
                              selectedOptions[option.name] === val;
                            let valImage = "";
                            if (product.variants) {
                              const mv = product.variants.find(
                                (v: any) =>
                                  v.options[option.name] === val && v.image,
                              );
                              if (mv) valImage = mv.image;
                            }
                            return (
                              <button
                                key={val}
                                onClick={() =>
                                  setSelectedOptions((p) => ({
                                    ...p,
                                    [option.name]: val,
                                  }))
                                }
                                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${isSelected ? "border-black bg-black text-white" : "border-black/10 bg-white text-black hover:border-black/30"}`}
                              >
                                {valImage && (
                                  <div className="w-4 h-4 rounded-sm overflow-hidden shrink-0">
                                    <Image
                                      src={valImage}
                                      width={16}
                                      height={16}
                                      alt=""
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                )}
                                {val}
                              </button>
                            );
                          })}
                        </div>
                        {option.name.includes("Хэмжээ") &&
                          product.sizeGuideUrl && (
                            <button
                              type="button"
                              onClick={async () => {
                                const result = await openExternalLink(
                                  product.sizeGuideUrl,
                                );
                                if (!result.ok) {
                                  toast.error("Холбоос нээхэд алдаа гарлаа", {
                                    style: {
                                      borderRadius: "8px",
                                      fontFamily: "inherit",
                                    },
                                  });
                                }
                              }}
                              className="text-[11px] text-black/40 hover:text-black underline underline-offset-2 mt-2 inline-block transition-colors"
                            >
                              Хэмжээний заавар →
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/[0.06]">
                  <p className="text-[11px] font-semibold text-black/40 uppercase tracking-widest">
                    Тоо
                  </p>
                  <div className="flex items-center border border-black/10 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-black hover:bg-black/[0.04] transition-colors active:bg-black/[0.08]"
                    >
                      <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-black border-l border-r border-black/10">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(displayInventory, quantity + 1))
                      }
                      className="w-10 h-10 flex items-center justify-center text-black hover:bg-black/[0.04] transition-colors active:bg-black/[0.08]"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                  {displayInventory > 0 && (
                    <p className="text-xs text-black/30 font-medium">
                      {displayInventory}ш үлдсэн
                    </p>
                  )}
                </div>

                {/* Desktop Add + Buy buttons */}
                <div className="hidden md:flex gap-3 mb-6">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-[14px] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${addedToCart ? "bg-emerald-500 text-white" : "bg-black/[0.06] text-black hover:bg-black/[0.10]"}`}
                  >
                    {addedToCart ? (
                      <>
                        <Check
                          className="w-4 h-4 pd-check-anim"
                          strokeWidth={2.5}
                        />
                        Нэмэгдлээ
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                        Сагсанд нэмэх
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBuyNow}
                    disabled={!canAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-[#FF5000] text-white font-semibold text-[14px] hover:bg-[#E64800] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(255,80,0,0.25)]"
                  >
                    Шууд авах{" "}
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </motion.button>
                  {isAdmin && (
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-slate-800 text-white font-semibold text-[14px] hover:bg-slate-900 transition-colors shadow-lg whitespace-nowrap"
                    >
                      ✏️ Засварлах
                    </Link>
                  )}
                </div>

                {/* Trust badges */}
                <div className="flex flex-col gap-3">
                  {[
                    {
                      icon: Truck,
                      label:
                        !product.sections?.includes("Захиалга") ||
                          product.sections?.includes("Бэлэн")
                          ? "Хурдан хүргэлт"
                          : "7–14 хоногт хүргэнэ",
                      sub: "Улаанбаатар хотын А, Б бүсэд",
                    },
                    {
                      icon: ShieldCheck,
                      label: "24/7 Тусламж",
                      sub: "Хэзээ ч холбогдох боломжтой",
                    },
                    {
                      icon: RotateCcw,
                      label: "Хялбар төлбөр",
                      sub: "Хамгийн хямд үнээр",
                    },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0">
                        <Icon
                          className="w-3.5 h-3.5 text-black/50"
                          strokeWidth={2}
                        />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-black">
                          {label}
                        </p>
                        <p className="text-[11px] text-black/40">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment methods */}
                <div className="mt-5 pt-5 border-t border-black/[0.06] flex items-center gap-2 flex-wrap">
                  <p className="text-[10px] font-semibold text-black/30 uppercase tracking-widest mr-1">
                    Төлбөр
                  </p>
                  {["QPay", "Карт"].map((m) => (
                    <span
                      key={m}
                      className="text-[10px] font-medium text-black/50 bg-black/[0.04] px-2 py-0.5 rounded-md"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white lg:rounded-2xl mt-3 overflow-hidden">
                <div className="flex border-b border-black/[0.06]">
                  {(["desc", "specs", "reviews"] as const).map((tab) => {
                    const labels = {
                      desc: "Тайлбар",
                      specs: "Үзүүлэлт",
                      reviews: "Үнэлгээ",
                    };
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3.5 text-[12px] font-semibold transition-colors relative ${activeTab === tab ? "text-black" : "text-black/30 hover:text-black/50"}`}
                      >
                        {labels[tab]}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="px-5 py-5 lg:px-8 lg:py-6">
                  <AnimatePresence mode="wait">
                    {activeTab === "desc" && (
                      <motion.div
                        key="desc"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <p className="text-[14px] text-black/60 leading-relaxed font-medium">
                          {product.description ||
                            "Дэлгэрэнгүй мэдээлэл ороогүй байна."}
                        </p>
                      </motion.div>
                    )}
                    {activeTab === "specs" && (
                      <motion.div
                        key="specs"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        {product.attributes &&
                          Object.keys(product.attributes).length > 0 ? (
                          <div className="flex flex-col divide-y divide-black/[0.05]">
                            {Object.entries(product.attributes).map(
                              ([k, v]) => (
                                <div
                                  key={k}
                                  className="flex items-start py-3 gap-4"
                                >
                                  <span className="text-[12px] text-black/40 font-medium min-w-[100px] shrink-0 pt-0.5">
                                    {k}
                                  </span>
                                  <span className="text-[13px] text-black font-medium">
                                    {String(v)}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-[14px] text-black/30 font-medium text-center py-4">
                            Үзүүлэлтийн мэдээлэл байхгүй байна.
                          </p>
                        )}
                      </motion.div>
                    )}
                    {activeTab === "reviews" && (
                      <motion.div
                        key="reviews"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ProductReviews productId={product.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products - now guaranteed to sit cleanly above the mobile payment bar */}
          {product.relatedProducts && product.relatedProducts.length > 0 && (
            <div className="mt-10 px-5 lg:px-8">
              <RelatedProducts products={product.relatedProducts} />
            </div>
          )}
        </div>

        {/* FIXED MOBILE PAYMENT BAR - FIXED POSITIONING */}
        <div
          className="fixed left-0 right-0 z-[60] md:hidden bg-white border-t border-black/[0.06]"
          style={{
            bottom: "calc(56px + env(safe-area-inset-bottom, 0px))"   // ← IMPORTANT: lifts it above bottom nav
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex flex-col min-w-0 mr-auto">
              <span className="text-[10px] text-black/30 font-medium uppercase tracking-wider">
                Нийт үнэ
              </span>
              <span className="text-[18px] font-bold text-black leading-tight tracking-tight">
                {formatPrice(displayPrice * quantity)}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-[13px] transition-all duration-200 shrink-0 disabled:opacity-40 ${addedToCart ? "bg-emerald-500 text-white" : "bg-black/[0.07] text-black"}`}
            >
              {addedToCart ? (
                <Check className="w-4 h-4" strokeWidth={2.5} />
              ) : (
                <ShoppingBag className="w-4 h-4" strokeWidth={2} />
              )}
              {addedToCart ? "Нэмэгдлээ" : "Сагсанд"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleBuyNow}
              disabled={!canAddToCart}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#FF5000] text-white font-semibold text-[13px] shadow-[0_4px_14px_rgba(255,80,0,0.3)] active:bg-[#E64800] transition-colors shrink-0 disabled:opacity-40"
            >
              Авах <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-5 right-5 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-3xl aspect-square rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[activeImageIndex]}
                alt=""
                fill
                className="object-contain"
                priority
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((p) => Math.max(0, p - 1));
                    }}
                    disabled={activeImageIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((p) =>
                        Math.min(images.length - 1, p + 1),
                      );
                    }}
                    disabled={activeImageIndex === images.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex(i);
                        }}
                        className={`h-1 rounded-full transition-all ${i === activeImageIndex ? "w-5 bg-white" : "w-1 bg-white/30"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}