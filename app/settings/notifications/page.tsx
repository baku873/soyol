'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShoppingBag, Truck, Tag, PackageCheck, MessageSquare, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type PrefKey = 'order' | 'delivery' | 'promo' | 'stock' | 'chat' | 'email';
type Preferences = Record<PrefKey, boolean>;

const TOGGLE_META: { id: PrefKey; icon: any; label: string }[] = [
    { id: 'order', icon: ShoppingBag, label: 'Захиалгын мэдэгдэл' },
    { id: 'delivery', icon: Truck, label: 'Хүргэлтийн мэдэгдэл' },
    { id: 'promo', icon: Tag, label: 'Урамшуулал & Хямдрал' },
    { id: 'stock', icon: PackageCheck, label: 'Бараа ирсэн мэдэгдэл' },
    { id: 'chat', icon: MessageSquare, label: 'Чат мэдэгдэл' },
    { id: 'email', icon: Mail, label: 'И-мэйл мэдэгдэл' },
];

const DEFAULT_PREFS: Preferences = {
    order: true,
    delivery: true,
    promo: true,
    stock: false,
    chat: true,
    email: false,
};

export default function NotificationsSettingsPage() {
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const patchingRef = useRef(false);

    // Fetch preferences on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/notifications/preferences');
                if (res.ok) {
                    const data = await res.json();
                    setPrefs({
                        order: !!data.order,
                        delivery: !!data.delivery,
                        promo: !!data.promo,
                        stock: !!data.stock,
                        chat: !!data.chat,
                        email: !!data.email,
                    });
                }
            } catch {
                toast.error('Тохиргоо ачааллахад алдаа гарлаа');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Optimistic toggle + PATCH
    const toggleSetting = useCallback(async (id: PrefKey) => {
        if (patchingRef.current) return;

        const prev = { ...prefs };
        const updated: Preferences = { ...prefs, [id]: !prefs[id] };

        // Optimistic update
        setPrefs(updated);

        patchingRef.current = true;
        try {
            const res = await fetch('/api/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
            if (!res.ok) throw new Error();
        } catch {
            // Revert on failure
            setPrefs(prev);
            toast.error('Тохиргоо хадгалахад алдаа гарлаа');
        } finally {
            patchingRef.current = false;
        }
    }, [prefs]);

    // Build the settings array from live state
    const settings = TOGGLE_META.map(meta => ({
        ...meta,
        enabled: prefs[meta.id],
    }));

    // Loading spinner
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
                <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                    <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                    </Link>
                    <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                        Мэдэгдэл
                    </h1>
                </div>
                <div className="flex items-center justify-center pt-32">
                    <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
            {/* Header */}
            <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                </Link>
                <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                    Мэдэгдэл
                </h1>
            </div>

            <div className="p-4 mt-2">
                <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    {settings.map((item, index) => (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between px-4 h-[64px] ${index !== settings.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-[40px] h-[40px] rounded-[10px] flex items-center justify-center ${item.enabled ? 'bg-orange-50' : 'bg-gray-50'}`}>
                                    <item.icon className="w-5 h-5" style={{ color: item.enabled ? '#FF6B00' : '#999999' }} strokeWidth={1.5} />
                                </div>
                                <span className="text-[15px] font-bold text-[#1A1A1A]">{item.label}</span>
                            </div>
                            <button
                                onClick={() => toggleSetting(item.id)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${item.enabled ? 'bg-[#FF6B00]' : 'bg-[#E5E5E5]'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
                <p className="px-4 mt-4 text-[13px] text-[#999999] leading-relaxed">
                    Мэдэгдлийн тохиргоог асааснаар танд хэрэгтэй мэдээллүүдийг цаг алдалгүй хүлээн авах боломжтой болно.
                </p>
            </div>
        </div>
    );
}
