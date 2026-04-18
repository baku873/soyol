'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { motion } from "framer-motion";
import { ChevronLeft, Clock, Package, Truck, CheckCircle2, XCircle, MapPin, Phone, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import useSWR from "swr";

import { CANCELLABLE_STATUSES, type OrderStatus } from "@/types/Order";

import { formatPrice } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; step: number }> = {
    pending: { label: 'Хүлээгдэж буй', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock, step: 1 },
    confirmed: { label: 'Баталгаажсан', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package, step: 2 },
    processing: { label: 'Боловсруулж байна', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package, step: 2 },
    shipped: { label: 'Хүргэлтэнд', color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck, step: 2 },
    delivered: { label: 'Хүргэгдсэн', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2, step: 3 },
    cancelled: { label: 'Цуцлагдсан', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, step: 0 },
};

const STEPS = [
    { key: 'pending', label: 'Захиалга', icon: Clock },
    { key: 'confirmed', label: 'Баталгаажсан', icon: Package },
    { key: 'delivered', label: 'Хүргэгдсэн', icon: Truck },
];

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading, mutate } = useSWR(`/api/orders/${id}`, fetcher);
    const order = data?.order;
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancel = async () => {
        if (!confirm('Та энэ захиалгыг цуцлахдаа итгэлтэй байна уу?')) return;
        setIsCancelling(true);

        // Optimistic update
        const previousData = data;
        mutate(
            {
                ...data,
                order: data?.order ? { ...data.order, status: 'cancelled' } : undefined,
            },
            false
        );

        try {
            const res = await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: id, status: 'cancelled' })
            });
            if (res.ok) {
                toast.success('Захиалга амжилттай цуцлагдлаа');
                mutate();
            } else {
                mutate(previousData, false);
                const errData = await res.json();
                toast.error(errData.error || 'Цуцлахад алдаа гарлаа');
            }
        } catch (e) {
            mutate(previousData, false);
            toast.error('Алдаа гарлаа');
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF5000]" />
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
            <Package className="w-12 h-12 text-slate-200" />
            <p className="font-bold text-slate-500">Захиалга олдсонгүй</p>
            <Link href="/orders" className="text-[#FF5000] font-bold text-sm">Буцах</Link>
        </div>
    );

    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    const currentStep = cfg.step;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <div className="bg-white sticky top-0 z-50 border-b border-slate-100 h-14 flex items-center px-4" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 3.5rem)' }}>
                <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition-transform">
                    <ChevronLeft className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
                </button>
                <h1 className="flex-1 text-center font-black text-slate-900 pr-8">Захиалга #{order._id.slice(-6).toUpperCase()}</h1>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-5 space-y-4">

                {/* Status */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-3xl p-5 ${cfg.bg} flex items-center gap-3`}
                >
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                    <div>
                        <p className={`font-black text-base ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </motion.div>

                {/* Progress steps */}
                {order.status !== 'cancelled' && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-5">
                        <div className="flex items-center justify-between relative">
                            {STEPS.map((step, i) => {
                                const done = currentStep > i + 1;
                                const active = currentStep === i + 1;
                                const StepIcon = step.icon;
                                return (
                                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1 relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${done || active ? 'bg-[#FF5000] border-[#FF5000]' : 'bg-slate-50 border-slate-200'}`}>
                                            <StepIcon className={`w-5 h-5 ${done || active ? 'text-white' : 'text-slate-400'}`} />
                                        </div>
                                        <span className={`text-[10px] font-bold text-center ${done || active ? 'text-[#FF5000]' : 'text-slate-400'}`}>{step.label}</span>
                                        {i < STEPS.length - 1 && (
                                            <div className={`absolute top-5 left-1/2 w-full h-0.5 -z-10 ${done ? 'bg-[#FF5000]' : 'bg-slate-200'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4">
                    <p className="font-black text-slate-900 text-sm">Захиалсан бараа</p>
                    {(order.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 shrink-0 relative">
                                <Image src={item.image || '/placeholder-product.png'} alt={item.name || 'Бараа'} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 text-sm line-clamp-2">{item.name}</p>
                                <p className="text-xs text-slate-400 mt-1">{item.quantity}ш × {formatPrice(item.price)}</p>
                            </div>
                            <p className="font-black text-[#FF5000] text-sm shrink-0">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                    ))}
                    <div className="border-t border-slate-100 pt-3 flex justify-between">
                        <span className="font-bold text-slate-500 text-sm">Нийт дүн</span>
                        <span className="font-black text-[#FF5000] text-lg">{formatPrice(order.total || order.totalPrice || 0)}</span>
                    </div>
                </div>

                {/* Address */}
                {(order.address || order.shipping?.address) && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-5">
                        <p className="font-black text-slate-900 text-sm mb-3">Хүргэлтийн мэдээлэл</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{order.address || order.shipping?.address}, {order.city || order.shipping?.city}</span>
                            </div>
                            {(order.phone || order.shipping?.phone) && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{order.phone || order.shipping?.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Cancel Button */}
                {CANCELLABLE_STATUSES.includes(order.status as OrderStatus) && (
                    <div className="pt-4 pb-8">
                        <button
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="w-full py-4 rounded-2xl bg-white text-red-500 font-bold border-2 border-red-50 hover:bg-red-50 transition-colors active:scale-[0.98]"
                        >
                            {isCancelling ? 'Уншиж байна...' : 'Захиалга цуцлах'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
