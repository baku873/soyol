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
                className="mb-12 flex flex-col items-start gap-3"
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-1 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Танд санал болгох бараа
                    </h2>
                </div>
                <p className="text-slate-500 text-sm font-medium ml-4">
                    Таны магадгүй сонирхох бусад бүтээгдэхүүнүүд
                </p>
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
