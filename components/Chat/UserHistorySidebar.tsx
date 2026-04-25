'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ShoppingBag, Video, Phone, Calendar, Clock, X, ExternalLink } from 'lucide-react';
import useSWR from 'swr';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

interface User {
    userId: string;
    name?: string;
}

interface UserHistorySidebarProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UserHistorySidebar({ user, isOpen, onClose }: UserHistorySidebarProps) {
    const [activeTab, setActiveTab] = useState<'orders' | 'calls'>('orders');

    const { data: ordersData } = useSWR(
        isOpen ? `/api/admin/orders?userId=${user.userId}` : null,
        fetcher
    );

    const { data: messagesData } = useSWR(
        isOpen ? `/api/messages?otherUserId=${user.userId}` : null,
        fetcher
    );

    const calls = messagesData?.filter((m: any) => m.type === 'call_started' || m.type === 'call_ended') || [];
    const orders = ordersData?.orders || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-80 md:w-96 z-50 bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-orange-500" />
                                <h2 className="font-bold text-white text-lg">Хэрэглэгчийн түүх</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex p-2 gap-2 bg-slate-800/30">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders'
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-slate-400 hover:bg-white/5'
                                    }`}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Захиалга
                            </button>
                            <button
                                onClick={() => setActiveTab('calls')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calls'
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-slate-400 hover:bg-white/5'
                                    }`}
                            >
                                <Video className="w-4 h-4" />
                                Дуудлага
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {activeTab === 'orders' ? (
                                orders.length === 0 ? (
                                    <EmptyState icon={ShoppingBag} message="Захиалгын түүх байхгүй" />
                                ) : (
                                    orders.map((order: any) => (
                                        <div key={order._id} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {order.items?.map((item: any, i: number) => (
                                                    <div key={i} className="flex gap-3 items-center">
                                                        <div className="w-10 h-10 rounded-lg bg-white/10 relative overflow-hidden shrink-0">
                                                            {item.image && (
                                                                <Image
                                                                    src={item.image}
                                                                    alt=""
                                                                    fill
                                                                    sizes="40px"
                                                                    className="object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-white font-bold truncate">{item.name}</p>
                                                            <p className="text-[10px] text-slate-400">{item.quantity}ш • {formatPrice(item.price)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-xs text-slate-400 font-medium">Нийт:</span>
                                                <span className="text-sm font-black text-orange-500">{formatPrice(order.totalPrice)}</span>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                calls.length === 0 ? (
                                    <EmptyState icon={Phone} message="Дуудлагын түүх байхгүй" />
                                ) : (
                                    calls.map((call: any) => (
                                        <div key={call._id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${call.type === 'call_started' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {call.type === 'call_started' ? <Phone className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-white font-bold">
                                                    {call.type === 'call_started' ? 'Дуудлага эхэлсэн' : 'Дуудлага дууссан'}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {new Date(call.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function EmptyState({ icon: Icon, message }: { icon: any, message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 opacity-50">
            <Icon className="w-12 h-12 mb-4 stroke-[1px]" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
