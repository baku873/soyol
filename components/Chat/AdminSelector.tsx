'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import UserStatus from './UserStatus';

interface AdminUser {
    _id: string;
    name?: string;
    email?: string;
    image?: string;
    userId: string;
    role?: string;
    isOnline?: boolean;
    isInCall?: boolean;
}

interface AdminSelectorProps {
    onSelect: (admin: AdminUser) => void;
    compact?: boolean;
}

export default function AdminSelector({ onSelect, compact = false }: AdminSelectorProps) {
    const { t } = useTranslation();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/users?role=admin')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    setAdmins(data);
                } else {
                    console.error('Expected an array of admins but got:', data);
                    setAdmins([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch admins', err);
                setAdmins([]);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center text-slate-400 ${compact ? 'p-4' : 'p-8'}`}>
                <Loader2 className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} animate-spin mb-2 text-[#FF5000]`} strokeWidth={1.2} />
                <p className="text-sm font-medium">{t('chat', 'findingSupport')}</p>
            </div>
        );
    }

    if (admins.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center text-slate-400 text-center ${compact ? 'p-4' : 'p-8'}`}>
                <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-white/5`}>
                    <MessageCircle className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} opacity-50`} strokeWidth={1.2} />
                </div>
                <h3 className={`${compact ? 'text-base' : 'text-lg'} font-bold text-white mb-2`}>{t('chat', 'noAgents')}</h3>
                <p className="text-xs font-medium">Please try again later.</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center ${compact ? 'p-2' : 'p-4'}`}>
            {!compact && <h2 className="text-2xl font-bold text-white mb-8">Select Support Agent</h2>}
            <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-4'} w-full max-w-2xl`}>
                {admins.map((admin) => (
                    <button
                        key={admin._id}
                        onClick={() => onSelect(admin)}
                        className={`flex items-center gap-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-[#FF5000]/50 transition-all group text-left ${compact ? 'p-3' : 'p-4'}`}
                    >
                        <div className={`relative rounded-xl overflow-hidden bg-slate-700 shrink-0 border-2 border-transparent group-hover:border-[#FF5000] transition-colors ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
                            {admin.image ? (
                                <Image
                                    src={admin.image}
                                    alt={admin.name || 'Admin'}
                                    fill
                                    sizes={compact ? "40px" : "48px"}
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-600 text-sm">
                                    {(admin.name || admin.email || 'A')[0].toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-white group-hover:text-[#FF5000] transition-colors truncate ${compact ? 'text-sm' : 'text-base'}`}>
                                {admin.name || 'Support Agent'}
                            </h3>
                            <UserStatus
                                isAdmin={admin.role === 'admin'}
                                isInCall={admin.isInCall}
                                isOnline={admin.isOnline}
                            />
                        </div>

                        <div className={`rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#FF5000] group-hover:text-white transition-all ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
                            <MessageCircle className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} strokeWidth={1.2} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
