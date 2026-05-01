'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Smartphone, Monitor, Loader2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

interface Session {
    _id: string;
    device: string;
    ip: string;
    createdAt: string;
    lastSeen: string;
    sessionToken?: string;
    isCurrent?: boolean;
}

function getDeviceIcon(device: string) {
    const lower = device.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android')) return Smartphone;
    return Monitor;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Одоо идэвхтэй';
    if (mins < 60) return `${mins} минутын өмнө`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} цагийн өмнө`;
    const days = Math.floor(hours / 24);
    return `${days} өдрийн өмнө`;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/sessions');
            if (!res.ok) throw new Error();
            const data: Session[] = await res.json();

            // Identify the current session by matching the auth_token cookie.
            // The first (most-recently-seen) session is treated as current since
            // cookie-based matching isn't possible from the client.
            // The API sorts by lastSeen desc, so index 0 is the most recent.
            if (data.length > 0) {
                data[0].isCurrent = true;
            }

            setSessions(data);
        } catch {
            toast.error('Сессүүд ачааллахад алдаа гарлаа');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const revokeSession = async (id: string) => {
        setRevokingId(id);
        try {
            const res = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Сессийг амжилттай устгалаа');
            await fetchSessions();
        } catch {
            toast.error('Сесс устгахад алдаа гарлаа');
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
            <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                <Link href="/settings/security" className="p-2 -ml-2 text-[#1A1A1A]">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                </Link>
                <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                    Идэвхтэй сессүүд
                </h1>
            </div>

            <div className="p-4 mt-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center pt-24">
                        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-4 py-8 text-center">
                        <p className="text-[14px] text-[#999]">Идэвхтэй сесс олдсонгүй</p>
                    </div>
                ) : (
                    sessions.map((s) => {
                        const Icon = getDeviceIcon(s.device);
                        return (
                            <div key={s._id} className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-4 py-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${s.isCurrent ? 'bg-[#FFF3E8]' : 'bg-[#F5F5F5]'}`}>
                                    <Icon className={`w-5 h-5 ${s.isCurrent ? 'text-[#FF6B00]' : 'text-[#999]'}`} strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-[#1A1A1A]">{s.device}</p>
                                    <p className="text-[12px] text-[#999]">
                                        {s.ip !== 'unknown' ? `${s.ip} · ` : ''}{s.isCurrent ? 'Одоо идэвхтэй' : timeAgo(s.lastSeen)}
                                    </p>
                                </div>
                                {s.isCurrent ? (
                                    <span className="text-[11px] font-bold text-[#FF6B00] bg-[#FFF3E8] px-2 py-0.5 rounded-full">Одоо</span>
                                ) : (
                                    <button
                                        onClick={() => revokeSession(s._id)}
                                        disabled={revokingId === s._id}
                                        className="flex items-center gap-1.5 text-[12px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                                    >
                                        {revokingId === s._id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <LogOut className="w-3.5 h-3.5" />
                                        )}
                                        Гаргах
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
