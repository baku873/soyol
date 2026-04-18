'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import useSWR from 'swr';
import { useUser } from '@/context/AuthContext';
import { Send, Video, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminSelector from '@/components/Chat/AdminSelector';
import VideoCall from '@/components/VideoCall';

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'text' | 'call_invite';
    roomName?: string;
    createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function MessagesContent() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const adminId = searchParams.get('adminId');

    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);

    const [callRoom, setCallRoom] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);

    const { data: messages, mutate } = useSWR<Message[]>(
        user && adminId ? `/api/messages?otherUserId=${adminId}` : null,
        fetcher,
        { refreshInterval: 3000 }
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !adminId) return;

        setSending(true);
        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: adminId,
                    content: newMessage,
                    type: 'text',
                }),
            });
            setNewMessage('');
            mutate();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleJoinCall = (room: string) => {
        setCallRoom(room);
        setIsCallActive(true);
    };

    const onDisconnected = () => {
        setIsCallActive(false);
        setCallRoom('');
    };

    const handleSelectAdmin = (admin: { userId: string }) => {
        router.push(`/messages?adminId=${admin.userId}`);
    };

    if (!isLoaded) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

    if (!adminId) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col">
                <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
                            <h1 className="text-xl font-bold text-white tracking-tight">Support Chat</h1>
                        </div>
                    </div>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <AdminSelector onSelect={handleSelectAdmin} />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/messages" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
                        <h1 className="text-xl font-bold text-white tracking-tight">Chat with Support</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 h-[calc(100vh-80px)]">
                {isCallActive ? (
                    <VideoCall prefilledRoom={callRoom} onDisconnected={onDisconnected} />
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                            {Array.isArray(messages) && messages.length === 0 && <div className="text-center text-slate-500 mt-10">Start a conversation with support.</div>}
                            {Array.isArray(messages) && messages.map((msg) => {
                                const isMe = msg.senderId === user?.id;
                                const isInvite = msg.type === 'call_invite';

                                return (
                                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMe
                                            ? 'bg-amber-600 text-white rounded-tr-none'
                                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                            }`}>
                                            {isInvite ? (
                                                <div className="flex flex-col gap-2">
                                                    <p className="font-medium flex items-center gap-2"><Video className="w-4 h-4" /> Video Call Invite</p>
                                                    <button onClick={() => handleJoinCall(msg.roomName!)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                                                        Join Call
                                                    </button>
                                                </div>
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}
                                            <span className="text-[10px] opacity-60 mt-1 block text-right">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="bg-slate-800/50 p-2 rounded-2xl border border-white/10 flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent border-none px-4 py-2 text-white placeholder-slate-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </>
                )}
            </main>
        </div>
    );
}

export default function ClientMessagesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
