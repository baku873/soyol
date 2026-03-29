'use client';

import { useState } from 'react';
import { Search, User as UserIcon, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface User {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    userId: string;
    role?: string;
    isOnline?: boolean;
    lastMessage?: string;
    unreadCount?: number;
    hasActiveChat?: boolean;
}

interface UserListProps {
    users: User[];
    selectedUser: User | null;
    onSelectUser: (user: User) => void;
}

export default function UserList({ users, selectedUser, onSelectUser }: UserListProps) {
    const [search, setSearch] = useState('');

    const filteredUsers = users.filter((u) => {
        const matchesSearch = search ? (
            (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.phone || '').includes(search)
        ) : true;

        // By default, only show users with active chats. If searching, show any match.
        if (!search && !u.hasActiveChat) return false;

        return matchesSearch;
    });

    return (
        <div className="flex flex-col h-full bg-[#0B1120]">
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Чатууд
                    </h2>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Хайх..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#1A2235] border border-transparent rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <p className="text-sm font-medium">{search ? 'Илэрц олдсонгүй' : 'Одоогоор чат алга байна'}</p>
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <button
                            key={user._id}
                            onClick={() => onSelectUser(user)}
                            className={`w-full px-4 py-4 flex items-center gap-4 transition-all duration-300 relative group
                                ${selectedUser?._id === user._id 
                                    ? 'bg-amber-500/10' 
                                    : 'hover:bg-white/5'
                                }`}
                        >
                            {selectedUser?._id === user._id && (
                                <motion.div 
                                    layoutId="active-indicator"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                                />
                            )}
                            
                            <div className="relative shrink-0">
                                <div className={`w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 ring-2 ${selectedUser?._id === user._id ? 'ring-amber-500/50' : 'ring-white/5'} group-hover:ring-amber-500/30 transition-all`}>
                                    {user.image ? (
                                        <Image src={user.image} alt={user.name || ''} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-black bg-gradient-to-br from-slate-700 to-slate-800 uppercase">
                                            {(user.name || user.email || '?')[0]}
                                        </div>
                                    )}
                                </div>
                                {/* Online Status Dot */}
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                
                                {user.role === 'admin' && (
                                    <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-1 rounded-lg shadow-lg">
                                        <ShieldCheck className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className={`text-sm font-bold truncate transition-colors ${
                                        selectedUser?._id === user._id ? 'text-amber-500' : 'text-slate-200'
                                    }`}>
                                        {user.name || 'User'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {user.unreadCount && user.unreadCount > 0 ? (
                                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                {user.unreadCount}
                                            </span>
                                        ) : null}
                                        {user.role === 'admin' && (
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate font-medium">
                                    {user.lastMessage ? (
                                        <span className={user.unreadCount && user.unreadCount > 0 ? 'text-slate-300 font-bold' : ''}>
                                            {user.lastMessage.substring(0, 30)}{user.lastMessage.length > 30 ? '...' : ''}
                                        </span>
                                    ) : (
                                        user.email || user.phone
                                    )}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
