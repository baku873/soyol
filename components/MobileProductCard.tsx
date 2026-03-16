'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { type Product } from '@/models/Product';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import ProductBadge from '@/components/ProductBadge';

interface MobileProductCardProps {
    product: Product;
}

export default function MobileProductCard({ product }: MobileProductCardProps) {
    const { convertPrice, currency } = useLanguage();
    const addItem = useCartStore((state) => state.addItem);
    const price = convertPrice(product.price);

    // Format price
    const formattedPrice = currency === 'USD'
        ? `$${price.toLocaleString()}`
        : `${formatCurrency(price)}`;

    return (
        <motion.div
            whileTap={{ scale: 0.97 }} 
            transition={{ type: 'spring', stiffness: 400, damping: 30 }} 
            className="group relative bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100/50 will-change-transform"
        >
            <Link href={`/product/${product.id}`} className="block">
                <div className="relative aspect-square overflow-hidden bg-gray-50 rounded-t-2xl">
                    <Image
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw"
                        className="object-cover"
                    />

                    {/* Premium Status & Discount Badges */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 items-start">
                        <ProductBadge
                            sections={product.sections}
                            isFeatured={product.featured}
                            className="z-10 scale-90 origin-top-left"
                        />
                        {product.discountPercent && product.discountPercent > 0 && (
                            <div className="px-2 py-1 bg-[#FF3B30] rounded-lg shadow-lg shadow-red-500/20">
                                <span className="text-[10px] font-black text-white">-{product.discountPercent}%</span>
                            </div>
                        )}
                        {product.stockStatus === 'in-stock' && (
                            <div className="px-2 py-1 bg-white/60 backdrop-blur-md rounded-xl border border-white/20 shadow-sm">
                                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">БЭЛЭН</span>
                            </div>
                        )}
                        {product.stockStatus === 'pre-order' && (
                            <div className="px-2 py-1 bg-white/60 backdrop-blur-md rounded-xl border border-white/20 shadow-sm">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">ЗАХИАЛГА</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3 flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-relaxed min-h-[44px]">
                        {product.name}
                    </h3>

                    <div className="flex flex-col gap-0.5 mt-1">
                        {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[10px] font-medium text-[#AAA] line-through">
                                {Math.round(product.originalPrice).toLocaleString()}₮
                            </span>
                        )}
                        <div className="flex items-end justify-between">
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-[#FF6B00]">
                                    {formattedPrice}
                                </span>
                                <span className="text-xs font-bold text-[#FF6B00] mb-0.5"> ₮</span>
                            </div>

                            {/* Minimalist Cart Button */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addItem({
                                        id: product.id,
                                        name: product.name,
                                        price: product.price,
                                        image: product.image || '',
                                        stockStatus: (product.stockStatus as any) || 'in-stock',
                                        category: product.category || '',
                                        description: product.description || undefined,
                                    });
                                    toast.success('Сагсанд нэмлээ', {
                                        style: { borderRadius: '14px', background: '#FF5000', color: '#fff' },
                                        duration: 1500,
                                    });
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-[#FF5000] text-white rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
                            >
                                <ShoppingCart className="w-5 h-5" strokeWidth={1.2} />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

