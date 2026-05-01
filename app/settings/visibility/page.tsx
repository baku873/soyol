'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type VisKey = 'profilePublic' | 'showPhone' | 'showOnline';
type VisPrefs = Record<VisKey, boolean>;

const TOGGLE_META: { key: VisKey; label: string }[] = [
    { key: 'profilePublic', label: 'Профайл нийтэд харагдах' },
    { key: 'showPhone', label: 'Утасны дугаар харуулах' },
    { key: 'showOnline', label: 'Онлайн байдал харуулах' },
];

const DEFAULT_PREFS: VisPrefs = {
    profilePublic: true,
    showPhone: false,
    showOnline: true,
};

export default function VisibilityPage() {
    const [prefs, setPrefs] = useState<VisPrefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const patchingRef = useRef(false);

    // Fetch on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    setPrefs({
                        profilePublic: data.profilePublic ?? true,
                        showPhone: data.showPhone ?? false,
                        showOnline: data.showOnline ?? true,
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
    const toggle = useCallback(async (key: VisKey) => {
        if (patchingRef.current) return;

        const prev = { ...prefs };
        const updated: VisPrefs = { ...prefs, [key]: !prefs[key] };

        setPrefs(updated);

        patchingRef.current = true;
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
            if (!res.ok) throw new Error();
        } catch {
            setPrefs(prev);
            toast.error('Тохиргоо хадгалахад алдаа гарлаа');
        } finally {
            patchingRef.current = false;
        }
    }, [prefs]);

    const items = TOGGLE_META.map(meta => ({
        ...meta,
        value: prefs[meta.key],
    }));

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
                <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                    <Link href="/settings/security" className="p-2 -ml-2 text-[#1A1A1A]">
                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                    </Link>
                    <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                        Профайл харагдах байдал
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
            <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                <Link href="/settings/security" className="p-2 -ml-2 text-[#1A1A1A]">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                </Link>
                <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                    Профайл харагдах байдал
                </h1>
            </div>
            <div className="p-4 mt-4">
                <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    {items.map((item, i) => (
                        <div key={item.key} className={`flex items-center justify-between px-4 h-[64px] ${i < items.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}>
                            <span className="text-[15px] font-bold text-[#1A1A1A]">{item.label}</span>
                            <button
                                onClick={() => toggle(item.key)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.value ? 'bg-[#FF6B00]' : 'bg-[#E5E5E5]'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${item.value ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
