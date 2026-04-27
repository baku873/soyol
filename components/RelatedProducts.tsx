'use client';

import { motion } from 'framer-motion';
import UniversalProductCard from './UniversalProductCard';
import type { Product } from '@/types/Product';
import { useTranslation } from '@/hooks/useTranslation';

interface RelatedProductsProps {
    products: Product[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
    const { t } = useTranslation();

    if (!products || products.length === 0) return null;

    // Deduplicate products based on ID
    const uniqueProducts = products.filter((item, index, self) =>
        index === self.findIndex((p) => p.id === item.id)
    );

    return (
        <div className="mt-24 border-t border-gray-100 pt-16">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="mb-10 flex flex-col items-start gap-3"
            >
                <div className="flex items-center gap-4">
                    <div className="h-8 w-2 bg-[#FF5000] rounded-r-xl" />
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">
                        Танд санал болгож буй бараа
                    </h2>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {uniqueProducts.slice(0, 4).map((product, index) => (
                    <UniversalProductCard
                        key={product.id}
                        product={product}
                        index={index}
                    />
                ))}
            </div>
        </div>
    );
}
