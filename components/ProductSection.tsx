'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductGrid from './ProductGrid';
import type { Product } from "@/types/Product";

interface ProductSectionProps {
  title: string;
  products: Product[];
  viewAllHref: string;
  hideHeader?: boolean;
}

const ProductSection = memo(function ProductSection({ title, products, viewAllHref, hideHeader = false }: ProductSectionProps) {
  return (
    <section className={hideHeader ? '' : 'relative py-8 sm:py-12 md:py-16'}>
      {/* Subtle dot pattern background */}
      {!hideHeader && (
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
      )}

      <div className={hideHeader ? '' : 'relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8'}>

        {/* Section Header */}
        {!hideHeader && title && (
          <div className="flex items-center justify-between mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {title}
            </h2>
            <Link href={viewAllHref}>
              <motion.div
                whileHover={{ x: 4 }}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-[#FF8C00] transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Бүгдийг үзэх</span>
                <span className="sm:hidden">Бүгд</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
              </motion.div>
            </Link>
          </div>
        )}

        {/* Product Grid */}
        <ProductGrid products={products} />
      </div>
    </section>
  );
});

export default ProductSection;
