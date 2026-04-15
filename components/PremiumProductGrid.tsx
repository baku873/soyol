"use client";

import { memo } from "react";
import { motion, Variants } from "framer-motion";
import UniversalProductCard from "./UniversalProductCard";
import { type Product } from "../models/Product";
import { useAuth } from "../context/AuthContext";

interface PremiumProductGridProps {
  products: Product[];
  featuredProducts?: Product[];
  disableFeaturedSeparation?: boolean;
  statusBadgeMode?: "default" | "ready" | "preorder" | "new" | "sale";
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

function PremiumProductGrid({
  products,
  featuredProducts,
  disableFeaturedSeparation = false,
  statusBadgeMode = "default",
}: PremiumProductGridProps) {
  const { isAdmin } = useAuth();
  // Separate featured and regular products
  let featured: Product[] = [];
  let regular: Product[] = [];

  if (disableFeaturedSeparation) {
    regular = products;
  } else {
    featured = featuredProducts || products.filter((p) => p.featured);
    regular = products.filter((p) => !p.featured);
  }

  return (
    <>
      {/* Featured Products Section */}
      {featured.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 p-2 sm:p-4 mb-8"
        >
          {featured.map((product, index) => (
            <UniversalProductCard
              key={product.id}
              isAdmin={isAdmin}
              statusBadgeMode={statusBadgeMode}
              product={
                statusBadgeMode === "default"
                  ? product
                  : ({
                    ...product,
                    stockStatus:
                      statusBadgeMode === "ready"
                        ? "in-stock"
                        : statusBadgeMode === "preorder"
                          ? "pre-order"
                          : product.stockStatus,
                    sections:
                      statusBadgeMode === "new"
                        ? Array.from(
                          new Set([...(product.sections || []), "Шинэ"]),
                        )
                        : statusBadgeMode === "sale"
                          ? Array.from(
                            new Set([
                              ...(product.sections || []),
                              "Хямдрал",
                            ]),
                          )
                          : product.sections,
                  } as Product)
              }
              index={index}
            />
          ))}
        </motion.div>
      )}

      {/* Section Heading Separator */}
      {featured.length > 0 && regular.length > 0 && (
        <div className="px-2 sm:px-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Бүх бүтээгдэхүүн
          </h2>
          <div className="h-0.5 w-16 bg-gradient-to-r from-orange-500 to-orange-300 mt-2 rounded-full"></div>
        </div>
      )}

      {/* Regular Products Section */}
      {regular.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 p-2 sm:p-4"
        >
          {regular.map((product, index) => (
            <UniversalProductCard
              key={product.id}
              isAdmin={isAdmin}
              statusBadgeMode={statusBadgeMode}
              product={
                statusBadgeMode === "default"
                  ? product
                  : ({
                    ...product,
                    stockStatus:
                      statusBadgeMode === "ready"
                        ? "in-stock"
                        : statusBadgeMode === "preorder"
                          ? "pre-order"
                          : product.stockStatus,
                    sections:
                      statusBadgeMode === "new"
                        ? Array.from(
                          new Set([...(product.sections || []), "Шинэ"]),
                        )
                        : statusBadgeMode === "sale"
                          ? Array.from(
                            new Set([
                              ...(product.sections || []),
                              "Хямдрал",
                            ]),
                          )
                          : product.sections,
                  } as Product)
              }
              index={index + featured.length}
            />
          ))}
        </motion.div>
      )}
    </>
  );
}

export default memo(PremiumProductGrid);
