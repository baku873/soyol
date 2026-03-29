'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import { Trash2, Minus, Plus, Check } from 'lucide-react';
import { useCartStore, type CartItem } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

interface AntiGravityCartItemProps {
    item: CartItem;
}

export default function AntiGravityCartItem({ item }: AntiGravityCartItemProps) {
    const removeItem = useCartStore((state) => state.removeItem);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const toggleItemSelection = useCartStore((state) => state.toggleItemSelection);

    const [deliveryEstimate, setDeliveryEstimate] = React.useState<string | null>(null);
    const [removing, setRemoving] = useState(false);
    const [imgError, setImgError] = useState(false);

    React.useEffect(() => {
        if (item.stockStatus === 'pre-order') {
            // Static estimate — API дуудахгүй
            const today = new Date();
            const arrival = new Date(today.setDate(today.getDate() + 14));
            const month = arrival.toLocaleString('mn-MN', { month: 'long' });
            const day = arrival.getDate();
            setDeliveryEstimate(`${month}ын ${day}-нд ирэх төлөвтэй`);
        }
    }, [item.id, item.stockStatus]);

    // Animation controls
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        setIsRemoving(true);
        setTimeout(async () => {
            await removeItem(item.cartItemId);
        }, 300); // Wait for the exit animation
    };

    const handleUpdateQuantity = async (newQty: number) => {
        if (newQty < 1) return;
        await updateQuantity(item.cartItemId, newQty);
    };

    const discount = item.originalPrice && item.originalPrice > item.price;

    const isPreOrder = item.stockStatus === 'pre-order';

    const dragX = useMotionValue(0);
    const background = useTransform(
        dragX,
        [-80, 0],
        ['rgba(239,68,68,0.15)', 'rgba(255,255,255,0)']
    );
    const trashOpacity = useTransform(dragX, [-80, -30], [1, 0]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={isRemoving ? { opacity: 0, x: -60, scale: 0.95 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40, scale: 0.97 }}
            className="relative overflow-hidden rounded-[20px] bg-white mb-3"
            style={{ boxShadow: item.selected ? '0 4px 16px rgba(255,80,0,0.08)' : '0 2px 10px rgba(0,0,0,0.03)' }}
        >
            <motion.div
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.08}
                style={{ x: dragX }}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -60) handleRemove();
                    else dragX.set(0);
                }}
                className="relative z-10 flex items-center gap-3 p-3.5"
            >
                {/* Checkbox (Circular for iOS) */}
                <button
                    onClick={() => toggleItemSelection(item.cartItemId)}
                    className="p-2 -ml-2 shrink-0 flex-none outline-none cursor-pointer"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <motion.div
                        whileTap={{ scale: 0.88 }}
                        style={{ width: 22, height: 22, minWidth: 22, minHeight: 22 }}
                        className={`rounded-full flex items-center justify-center transition-all ${item.selected
                            ? 'bg-[#FF5000] shadow-[0_2px_8px_rgba(255,80,0,0.3)]'
                            : 'bg-white border-2 border-[#E5E5EA]'
                            }`}
                    >
                        {item.selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                    </motion.div>
                </button>

                {/* Image */}
                <div className="w-[72px] h-[72px] rounded-[16px] overflow-hidden bg-[#F7F7F5] shrink-0 flex items-center justify-center">
                    <Image
                        src={imgError ? '/soyol-logo.png' : (item.image || '/soyol-logo.png')}
                        onError={() => setImgError(true)}
                        alt={item.name}
                        width={72}
                        height={72}
                        className="object-contain p-1.5"
                    />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.id}`}>
                        <h3 className="text-[13px] font-semibold text-black leading-tight truncate mb-1">
                            {item.name}
                        </h3>
                    </Link>
                    <p className="text-[10px] text-black/30 font-medium uppercase tracking-wider mb-2">
                        {item.category}
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <span className="ml-1 text-black/40 normal-case tracking-normal">
                                · {Object.values(item.selectedOptions).join(' / ')}
                            </span>
                        )}
                    </p>
                    <div className="flex items-center justify-between">
                        {isPreOrder ? (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                Захиалга
                            </span>
                        ) : (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                Бэлэн
                            </span>
                        )}
                        {/* Qty controls */}
                        <div
                            className="flex items-center bg-[#F2F2F7] rounded-full overflow-hidden flex-shrink-0"
                            style={{ height: 28, width: 'fit-content' }}
                        >
                            <button
                                onClick={() => handleUpdateQuantity(item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                style={{ width: 28, height: 28, minWidth: 28, flexShrink: 0 }}
                                className={`flex items-center justify-center transition-colors ${item.quantity <= 1 ? 'text-black/20' : 'text-black/60 active:bg-black/[0.06]'
                                    }`}
                            >
                                <Minus className="w-3 h-3" strokeWidth={3} />
                            </button>
                            <span style={{ width: 24, flexShrink: 0 }} className="text-center text-[12px] font-semibold text-black select-none">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => handleUpdateQuantity(item.quantity + 1)}
                                style={{ width: 28, height: 28, minWidth: 28, flexShrink: 0 }}
                                className="flex items-center justify-center text-black/60 active:bg-black/[0.06] transition-colors"
                            >
                                <Plus className="w-3 h-3" strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Price + delete */}
                <div className="flex flex-col items-end justify-between self-stretch shrink-0 ml-1 py-0.5">
                    <p className="text-[15px] font-bold text-[#111] tracking-tight leading-none px-1">
                        {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                        onClick={handleRemove}
                        className="text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors p-1.5"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

