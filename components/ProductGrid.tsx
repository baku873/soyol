'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import UniversalProductCard from './UniversalProductCard';
import type { Product } from '@/types/Product';

interface ProductGridProps {
    products: Product[];
    columns?: number;
}

const ProductGrid = memo(function ProductGrid({ products, columns = 4 }: ProductGridProps) {
    if (!products || products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <p className="font-medium italic">Бүтээгдэхүүн олдсонгүй.</p>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${columns} gap-4 sm:gap-6 md:gap-8`}>
            {products.map((product, index) => (
                <UniversalProductCard
                    key={product.id || index}
                    product={product}
                    index={index}
                />
            ))}
        </div>
    );
});

export default ProductGrid;
