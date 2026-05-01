'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductForm from '@/components/admin/ProductForm';

export default function VendorAddProductPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auth check on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/auth/me');
                const data = await res.json();
                if (!data.user || data.user.role !== 'vendor') {
                    router.replace('/login');
                    return;
                }
                setAuthorized(true);
            } catch {
                router.replace('/login');
            }
        })();
    }, [router]);

    const handleSubmit = async (formData: any) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/vendor/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Бараа нэмэхэд алдаа гарлаа');
            }

            toast.success('Бараа амжилттай нэмэгдлээ!', {
                icon: '✅',
                style: {
                    borderRadius: '12px',
                    background: '#10B981',
                    color: '#fff',
                },
            });
            router.push('/vendor/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Алдаа гарлаа');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authorized) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Буцах</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/20 ring-1 ring-white/10">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                Шинэ бараа нэмэх
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Бүтээгдэхүүний мэдээллийг бөглөнө үү
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Reuse admin ProductForm */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <ProductForm
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                </motion.div>
            </div>
        </div>
    );
}
