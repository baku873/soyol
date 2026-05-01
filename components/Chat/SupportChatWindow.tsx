'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, Loader2, MessageCircle, Headphones, CheckCheck } from 'lucide-react';
import useSWR from 'swr';
import { useUser } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { buildTimeline } from '@/lib/messageUtils';

interface SupportMessage {
    _id: string;
    senderId: string;
    senderType: 'user' | 'admin';
    body: string;
    createdAt: string;
}

interface SupportChatWindowProps {
    conversationId: string;
    onBack: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SupportChatWindow({ conversationId, onBack }: SupportChatWindowProps) {
    const { user } = useUser();
    const { t } = useTranslation();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [sending, setSending] = useState(false);

    const effectiveUserId = user?.id;

    const { data, mutate } = useSWR<{ messages: SupportMessage[] }>(
        `/api/messages/conversations/${conversationId}/messages`,
        fetcher,
        { refreshInterval: 3000 }
    );

    const messages = data?.messages || [];

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const autoResize = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }, []);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await fetch(`/api/messages/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: newMessage,
                }),
            });
            setNewMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            mutate();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const timeline = buildTimeline(messages);

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent relative">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-slate-800/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95">
                        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5000] to-orange-400 flex items-center justify-center shadow-md shadow-orange-500/15">
                            <Headphones className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-800" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm leading-tight">{t('chat', 'supportTeam')}</h3>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            {t('chat', 'online')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Loading */}
                {!data && (
                    <div className="flex flex-col justify-center items-center h-full gap-3">
                        <Loader2 className="w-6 h-6 text-[#FF5000] animate-spin" />
                        <p className="text-xs text-slate-500">Loading messages...</p>
                    </div>
                )}

                {/* Empty state */}
                {messages.length === 0 && data && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/5 flex items-center justify-center shadow-lg">
                            <MessageCircle className="w-7 h-7 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-300">Start the conversation</p>
                            <p className="text-xs text-slate-500 mt-1">Say hello and we&apos;ll respond shortly</p>
                        </div>
                    </div>
                )}

                {/* Message timeline */}
                {messages.length > 0 && timeline.map((item, idx) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`date-${idx}`} className="flex justify-center my-4">
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-800/80 px-3 py-1 rounded-full border border-white/[0.06]">
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
                            {/* Admin mini avatar */}
                            {!isMe && (
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#FF5000]/20 to-orange-500/20 flex items-center justify-center mr-2 mt-auto mb-0.5 shrink-0 border border-[#FF5000]/10">
                                    <Headphones className="w-3 h-3 text-[#FF5000]" />
                                </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[82%]`}>
                                {group.messages.map((msg, msgIdx) => {
                                    const isFirst = msgIdx === 0;
                                    const isLast = msgIdx === group.messages.length - 1;

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
                                            key={msg._id.toString()}
                                            className={`${bubbleRadius} px-3.5 py-2 shadow-sm ${
                                                isMe
                                                    ? 'bg-gradient-to-br from-[#FF5000] to-[#E64500] text-white'
                                                    : 'bg-slate-800/80 text-slate-200 border border-white/[0.06]'
                                            } ${msgIdx > 0 ? 'mt-[2px]' : ''}`}
                                        >
                                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                            {isLast && (
                                                <div className={`flex items-center gap-1 justify-end mt-0.5`}>
                                                    <span className={`text-[10px] ${isMe ? 'text-white/45' : 'text-slate-500'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/[0.06] bg-slate-900/60 backdrop-blur-md">
                <div className="flex gap-2 items-end bg-slate-800/50 rounded-2xl border border-white/[0.06] p-1.5 transition-all focus-within:border-[#FF5000]/20">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            autoResize();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chat', 'typeMessage')}
                        className="flex-1 bg-transparent border-none px-3 py-2 text-white placeholder-slate-500 text-sm outline-none resize-none max-h-[100px] leading-relaxed"
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
        </div>
    );
}
