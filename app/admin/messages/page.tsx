'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Loader2, BarChart3, Package, ShoppingCart, MessageCircle, Tag, Layers,
    Video, Phone
} from 'lucide-react';
import UserList from '../../../components/Chat/UserList';
import ChatWindow from '../../../components/Chat/ChatWindow';
import { motion } from 'framer-motion';
import VideoCall from '../../../components/VideoCall';

interface User {
    _id: string;
    name?: string;
    email?: string;
    image?: string;
    userId: string;
    role?: string;
    isOnline?: boolean;
    lastMessage?: string;
    unreadCount?: number;
}

export default function AdminMessagesPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewFilter, setViewFilter] = useState<'all' | 'clients' | 'admins'>('all');

    // Call State
    const [callRoom, setCallRoom] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);
    const [isVoiceCall, setIsVoiceCall] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Mobile View State: 'list' | 'chat' | 'call'
    const [mobileView, setMobileView] = useState<'list' | 'chat' | 'call'>('list');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                setUsers(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch users', err);
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        // Just use the sorted users from the API, filtering by search happens in UserList
        setFilteredUsers(users);
    }, [users]);

    // Timer logic
    useEffect(() => {
        if (isCallActive) {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setCallDuration(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isCallActive]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startCall = async (isVoice: boolean = false) => {
        if (!selectedUser) return;

        const room = `call-${Date.now()}`;
        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: selectedUser.userId,
                    content: isVoice
                        ? `📞 Дуут дуудлага эхэллээ: ${room}`
                        : `📹 Видео дуудлага эхэллээ: ${room}`,
                    type: 'call_invite',
                    roomName: room
                })
            });

            setCallRoom(room);
            setIsVoiceCall(isVoice);
            setIsCallActive(true);
            setMobileView('call');
        } catch (e) {
            console.error(e);
        }
    };

    const handleStartCall = () => startCall(false);
    const handleStartVoiceCall = () => startCall(true);

    const onDisconnected = () => {
        setIsCallActive(false);
        setCallRoom('');
        setMobileView('chat');
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setMobileView('chat');
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 h-screen bg-slate-950 relative">
            {/* Header (Desktop & Mobile when not in call) */}
            {!isCallActive && (
                <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0 z-20">
                    <div className="pl-16 pr-4 sm:pl-20 sm:pr-8 lg:px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">Мессеж & Дуудлага</h1>
                                <p className="text-xs text-slate-400 mt-1">Хэрэглэгчидтэй харилцах</p>
                            </div>
                        </div>

                        {/* Call Status Indicator (Desktop Header) */}
                        {isCallActive && (
                            <div className="hidden md:flex items-center gap-4 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                                <div className="relative">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute inset-0" />
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full relative" />
                                </div>
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Дуудлага идэвхтэй</span>
                                <div className="w-px h-4 bg-emerald-500/20" />
                                <span className="text-sm font-mono font-bold text-white">{formatDuration(callDuration)}</span>
                            </div>
                        )}
                    </div>
                </header>
            )}

            <main className="flex-1 flex overflow-hidden relative">
                {loading ? (
                    <div className="w-full flex justify-center items-center"><Loader2 className="animate-spin text-amber-500 w-10 h-10" /></div>
                ) : (
                    <>
                        {/* User List Sidebar */}
                        <div className={`
                            ${mobileView === 'list' ? 'flex' : 'hidden lg:flex'} 
                            w-full lg:w-80 h-full flex-col border-r border-slate-800 bg-slate-900/40
                        `}>
                            <UserList
                                users={filteredUsers}
                                selectedUser={selectedUser}
                                onSelectUser={handleSelectUser}
                            />
                        </div>

                        {/* Chat / Call Content Area */}
                        <div className={`
                            ${mobileView !== 'list' ? 'flex' : 'hidden lg:flex'} 
                            flex-1 h-full flex-col relative
                        `}>
                            {isCallActive ? (
                                <VideoCall
                                    prefilledRoom={callRoom}
                                    onDisconnected={onDisconnected}
                                    initialVideoDisabled={isVoiceCall}
                                />
                            ) : (
                                <div className="flex-1 h-full bg-slate-950/30 flex flex-col">
                                    {selectedUser ? (
                                        <ChatWindow
                                            otherUser={selectedUser}
                                            onStartCall={handleStartCall}
                                            onStartVoiceCall={handleStartVoiceCall}
                                            onBack={() => setMobileView('list')}
                                        />
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-[#0B1120]">
                                            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                                <MessageCircle className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Чат сонгох</h3>
                                            <p className="text-sm max-w-[260px] text-slate-400 font-medium leading-relaxed">
                                                Зүүн талаас харилцагчаа сонгож чатлах эсвэл видео дуудлага хийнэ үү.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
