'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Video, Phone, ArrowLeft, History, ChevronDown, Loader2, CheckCheck, PhoneCall } from 'lucide-react';
import { Message } from '../../types/Message';
import Image from 'next/image';
import useSWR from 'swr';
import { useUser } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import UserStatus from './UserStatus';
import UserHistorySidebar from './UserHistorySidebar';
import { buildTimeline } from '@/lib/messageUtils';

interface User {
    _id: string;
    name?: string;
    email?: string;
    image?: string;
    userId: string;
    role?: string;
    isOnline?: boolean;
    isInCall?: boolean;
}

interface ChatWindowProps {
    otherUser: User;
    guestId?: string;
    onStartCall: () => void;
    onStartVoiceCall: () => void;
    onBack: () => void;
}

const fetcher = ([url, guestId]: [string, string | undefined]) =>
    fetch(url, {
        headers: guestId ? { 'x-guest-id': guestId } : {}
    }).then((res) => res.json());

export default function ChatWindow({ otherUser, guestId, onStartCall, onStartVoiceCall, onBack }: ChatWindowProps) {
    const { user } = useUser();
    const { t } = useTranslation();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const { data: messages, mutate } = useSWR<Message[]>(
        [`/api/messages?otherUserId=${otherUser._id || otherUser.userId}`, guestId],
        fetcher,
        { refreshInterval: 3000 }
    );

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const handleScroll = useCallback(() => {
        const el = scrollAreaRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollBtn(distFromBottom > 180);
    }, []);

    useEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distFromBottom < 300) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(guestId ? { 'x-guest-id': guestId } : {})
                },
                body: JSON.stringify({
                    receiverId: otherUser.userId,
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

    // Adapt Message type for buildTimeline
    const adaptedMessages = (messages || []).map(msg => ({
        ...msg,
        _id: msg._id?.toString() || '',
        senderType: msg.senderId === (user?.id || guestId) ? 'user' : 'other',
        createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt),
        content: msg.content,
        type: msg.type,
    }));

    // Build a merged timeline
    const timeline = buildTimeline(adaptedMessages);

    // User initials for fallback avatar
    const userInitial = (otherUser.name || otherUser.email || '?')[0].toUpperCase();

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent relative">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-slate-800/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95">
                        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-700 ring-2 ring-white/[0.06]">
                            {otherUser.image ? (
                                <Image
                                    src={otherUser.image}
                                    alt={otherUser.name || ''}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/80 font-semibold bg-gradient-to-tr from-slate-600 to-slate-500 text-sm">
                                    {userInitial}
                                </div>
                            )}
                        </div>
                        {/* Online indicator */}
                        {otherUser.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm leading-tight">{otherUser.name || 'User'}</h3>
                        <UserStatus
                            isAdmin={otherUser.role === 'admin'}
                            isInCall={otherUser.isInCall}
                            isOnline={otherUser.isOnline}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-[#FF5000] transition-all border border-white/[0.04] active:scale-95"
                        title="View History"
                    >
                        <History className="w-4.5 h-4.5" strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={onStartCall}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 transition-all border border-white/[0.04] hover:border-amber-500/20 active:scale-95"
                        title="Start Video Call"
                    >
                        <Video className="w-4.5 h-4.5" strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={onStartVoiceCall}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-all border border-white/[0.04] hover:border-emerald-500/20 active:scale-95"
                        title="Start Voice Call"
                    >
                        <Phone className="w-4.5 h-4.5" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4"
            >
                {/* Top gradient fade */}
                <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-900/80 to-transparent -mt-4 mb-2 pointer-events-none z-10" />

                {timeline.map((item, idx) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`date-${idx}`} className="flex justify-center my-5">
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-800/80 px-3.5 py-1 rounded-full border border-white/[0.06] backdrop-blur-sm">
                                    {item.label}
                                </span>
                            </div>
                        );
                    }

                    const { group } = item;
                    const isMe = group.senderType === 'user';

                    return (
                        <div
                            key={`group-${idx}`}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}
                        >
                            {/* Other user mini avatar */}
                            {!isMe && (
                                <div className="w-6 h-6 rounded-lg overflow-hidden mr-2 mt-auto mb-0.5 shrink-0 ring-1 ring-white/[0.06]">
                                    {otherUser.image ? (
                                        <Image
                                            src={otherUser.image}
                                            alt=""
                                            width={24}
                                            height={24}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-600 to-slate-500 text-white/80 text-[10px] font-semibold">
                                            {userInitial}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                {group.messages.map((msg, msgIdx) => {
                                    const typedMsg = msg as any;
                                    const isFirst = msgIdx === 0;
                                    const isLast = msgIdx === group.messages.length - 1;
                                    const isInvite = typedMsg.type === 'call_invite';
                                    const isCall = typedMsg.type === 'call_started' || typedMsg.type === 'call_ended';

                                    if (isCall) {
                                        return (
                                            <div key={typedMsg._id} className="flex justify-center my-4 w-full">
                                                <div className="bg-slate-800/60 text-slate-400 text-[11px] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/[0.04]">
                                                    <PhoneCall className="w-3 h-3" />
                                                    <span>
                                                        {typedMsg.type === 'call_started' ? 'Call started' : 'Call ended'} ·{' '}
                                                        {new Date(typedMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Bubble radius logic
                                    let bubbleRadius = '';
                                    if (isMe) {
                                        if (group.messages.length === 1) bubbleRadius = 'rounded-2xl rounded-br-md';
                                        else if (isFirst) bubbleRadius = 'rounded-2xl rounded-br-md';
                                        else if (isLast) bubbleRadius = 'rounded-2xl rounded-tr-md';
                                        else bubbleRadius = 'rounded-2xl rounded-r-md';
                                    } else {
                                        if (group.messages.length === 1) bubbleRadius = 'rounded-2xl rounded-bl-md';
                                        else if (isFirst) bubbleRadius = 'rounded-2xl rounded-bl-md';
                                        else if (isLast) bubbleRadius = 'rounded-2xl rounded-tl-md';
                                        else bubbleRadius = 'rounded-2xl rounded-l-md';
                                    }

                                    return (
                                        <div
                                            key={typedMsg._id}
                                            className={`${bubbleRadius} px-3.5 py-2 shadow-sm ${
                                                isMe
                                                    ? 'bg-gradient-to-br from-[#FF5000] to-[#E64500] text-white'
                                                    : 'bg-slate-800/80 text-slate-200 border border-white/[0.06]'
                                            } ${msgIdx > 0 ? 'mt-[2px]' : ''}`}
                                        >
                                            {isInvite ? (
                                                <div className="flex flex-col gap-2">
                                                    <p className="font-bold text-sm flex items-center gap-2">
                                                        <Video className="w-4 h-4" />
                                                        Video call invite
                                                    </p>
                                                    <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all active:scale-95">
                                                        Join Call
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{typedMsg.content}</p>
                                            )}
                                            {isLast && (
                                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                                    <span className={`text-[10px] ${isMe ? 'text-white/45' : 'text-slate-500'}`}>
                                                        {new Date(typedMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && <CheckCheck className="w-3 h-3 text-white/35" />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom FAB */}
            {showScrollBtn && (
                <button
                    onClick={() => scrollToBottom()}
                    className="absolute bottom-20 right-4 z-10 p-2.5 bg-slate-800/90 border border-white/10 rounded-full shadow-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all backdrop-blur-sm hover:scale-105 active:scale-95"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/[0.06] bg-slate-900/60 backdrop-blur-md">
                <div className="flex gap-2 items-center bg-slate-800/50 rounded-2xl border border-white/[0.06] p-1.5 transition-all focus-within:border-[#FF5000]/20">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('chat', 'typeMessage')}
                        className="flex-1 bg-transparent border-none px-3 py-2 text-white placeholder-slate-500 text-sm outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-2.5 bg-gradient-to-r from-[#FF5000] to-[#E64500] hover:from-[#FF6020] hover:to-[#FF5000] text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-orange-500/15 active:scale-95 disabled:shadow-none shrink-0"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" strokeWidth={1.5} />
                        )}
                    </button>
                </div>
            </form>

            <UserHistorySidebar
                user={{ userId: otherUser.userId, name: otherUser.name }}
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
        </div>
    );
}
