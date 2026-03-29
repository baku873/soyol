'use client';

import { motion } from 'framer-motion';

interface ProductBadgeProps {
    rating?: number;
    sections?: string[];
    isFeatured?: boolean;
    showTrendingBadge?: boolean;
    className?: string;
}

export default function ProductBadge({
    rating = 0,
    sections = [],
    isFeatured = false,
    showTrendingBadge = false,
    className = ''
}: ProductBadgeProps) {
    let badgeLabel = '';
    let badgeIcon = '';
    let badgeStyle = '';

    const isNew = sections.includes('Шинэ');

    if (isNew) {
        badgeLabel = 'Шинэ';
        badgeIcon = '✨';
        badgeStyle = 'bg-gradient-to-r from-[#007AFF] to-[#005AD6] shadow-[0_4px_12px_rgba(0,122,255,0.25)]';
    } else if (isFeatured) {
        badgeLabel = 'Онцгой';
        badgeIcon = '✨';
        badgeStyle = 'bg-gradient-to-r from-[#FF6B00] to-[#FF5000] shadow-[0_4px_12px_rgba(255,80,0,0.25)]';
    } else {
        return null; // No badge
    }

    return (
        <motion.div
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white pointer-events-auto ${badgeStyle} ${className}`}
        >
            <span className="text-[12px] leading-none mb-0.5">{badgeIcon}</span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-none mt-[1px]">
                {badgeLabel}
            </span>
        </motion.div>
    );
}
