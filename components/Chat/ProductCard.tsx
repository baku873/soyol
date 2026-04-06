'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Star } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        price: number;
        image?: string;
        rating?: number;
        isCargo?: boolean;
    };
}

export default function ProductCard({ product }: ProductCardProps) {
    const addItem = useCartStore((s) => s.addItem);

    const getValidImageSrc = (src?: string) => {
        if (!src) return '/placeholder.png';
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/')) {
            return src;
        }
        return `/${src}`;
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image: getValidImageSrc(product.image),
            category: 'general',
            stockStatus: 'in-stock',
        });
        toast.success('Сагсанд нэмэгдлээ');
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('mn-MN').format(price) + '₮';
    };

    return (
        <div className="w-full max-w-[240px] bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 my-2 not-prose">
            <Link href={`/product/${product.id}`} className="block">
                <div className="relative aspect-square bg-slate-50">
                    <Image
                        src={getValidImageSrc(product.image)}
                        alt={product.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="p-3">
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1 leading-tight">
                        {product.name} {product.isCargo && " + Карго"}
                    </h4>
                    <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < Math.round(product.rating || 0)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-slate-200 fill-slate-200'
                                    }`}
                                strokeWidth={1.2}
                            />
                        ))}
                        <span className="text-xs text-slate-400 ml-1">
                            {product.rating || '0.0'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-orange-600 text-sm">
                            {formatPrice(product.price)}
                        </span>
                        <button
                            onClick={handleAddToCart}
                            className="p-2 bg-[#FF5000] text-white rounded-xl hover:bg-[#E64500] transition-colors shadow-sm"
                        >
                            <ShoppingCart className="w-4 h-4" strokeWidth={1.2} />
                        </button>
                    </div>
                </div>
            </Link>
        </div>
    );
}
