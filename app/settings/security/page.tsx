'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Lock, Eye, BarChart2, Smartphone, Fingerprint, Activity, PauseCircle, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrivacyPage() {
    const [dataUsage, setDataUsage] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    setDataUsage(data.dataUsageConsent ?? true);
                }
            } catch (error) {
                console.error('Failed to load security settings', error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleDataUsageToggle = async () => {
        const prev = dataUsage;
        const next = !prev;
        setDataUsage(next); // Optimistic

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUsageConsent: next }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setDataUsage(prev); // Revert
            toast.error('Алдаа гарлаа');
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
            {/* Header */}
            <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                </Link>
                <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                    Нууцлал & Аюулгүй байдал
                </h1>
            </div>

            <div className="p-4 space-y-6 mt-2">

                {/* Нууцлал */}
                <div>
                    <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Нууцлал</h2>
                    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">

                        <Link href="/settings/password" className="flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors border-b border-[#F5F5F5]">
                            <div className="flex items-center gap-4">
                                <Lock className="w-[22px] h-[22px] text-[#444444]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#1A1A1A]">Нууц үг солих</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#CCCCCC]" strokeWidth={2} />
                        </Link>

                        <Link href="/settings/visibility" className="flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors border-b border-[#F5F5F5]">
                            <div className="flex items-center gap-4">
                                <Eye className="w-[22px] h-[22px] text-[#444444]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#1A1A1A]">Профайл харагдах байдал</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#CCCCCC]" strokeWidth={2} />
                        </Link>

                        <div className="flex items-center justify-between px-4 h-[64px]">
                            <div className="flex items-center gap-4">
                                <BarChart2 className="w-[22px] h-[22px] text-[#444444]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#1A1A1A]">Мэдээлэл ашиглалт</span>
                            </div>
                            {loading ? (
                                <Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" />
                            ) : (
                                <button
                                    onClick={handleDataUsageToggle}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dataUsage ? 'bg-[#FF6B00]' : 'bg-[#E5E5E5]'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${dataUsage ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            )}
                        </div>

                    </div>
                </div>

                {/* Аюулгүй байдал */}
                <div>
                    <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Аюулгүй байдал</h2>
                    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">

                        <div className="flex items-center justify-between px-4 h-[64px] border-b border-[#F5F5F5]">
                            <div className="flex items-center gap-4">
                                <Smartphone className="w-[22px] h-[22px] text-[#444444]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#1A1A1A]">2 шатлалт баталгаажуулалт</span>
                            </div>
                            <span className="text-[11px] font-bold text-[#999] bg-[#F5F5F5] px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Тун удахгүй
                            </span>
                        </div>

                        <div className="flex items-center justify-between px-4 h-[64px] border-b border-[#F5F5F5]">
                            <div className="flex items-center gap-4">
                                <Fingerprint className="w-[22px] h-[22px] text-[#444444]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#1A1A1A]">Биометр нэвтрэлт</span>
                            </div>
                            <span className="text-[11px] font-bold text-[#999] bg-[#F5F5F5] px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Тун удахгүй
                            </span>
                        </div>

                        <Link href="/settings/sessions" className="flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <Activity className="w-[22px] h-[22px] text-[#444444]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#1A1A1A]">Идэвхтэй сесс харах</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#CCCCCC]" strokeWidth={2} />
                        </Link>

                    </div>
                </div>

                {/* Дансны удирдлага */}
                <div>
                    <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Дансны удирдлага</h2>
                    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">

                        <button className="w-full flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors text-left border-b border-[#F5F5F5]">
                            <div className="flex items-center gap-4">
                                <PauseCircle className="w-[22px] h-[22px] text-[#FF6B00]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#FF6B00]">Данс түр зогсоох</span>
                            </div>
                        </button>

                        <button className="w-full flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors text-left">
                            <div className="flex items-center gap-4">
                                <Trash2 className="w-[22px] h-[22px] text-[#FF3B30]" strokeWidth={1.5} />
                                <span className="text-[15px] font-bold text-[#FF3B30]">Данс устгах</span>
                            </div>
                        </button>

                    </div>
                </div>

            </div>
        </div>
    );
}
