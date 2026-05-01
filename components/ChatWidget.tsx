'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Video, Phone, MessageCircle, Loader2, Sparkles, Headphones } from 'lucide-react';
import AIChatWindow from '../components/Chat/AIChatWindow';
import SupportChatWindow from '../components/Chat/SupportChatWindow';
import VideoCall from '../components/VideoCall';
import { useUser } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
    const { user } = useUser();
    const { t } = useTranslation();

    // Generate a stable guest ID for unauthenticated users so chat messages have a sender
    const [guestId] = useState(() => {
        if (typeof window === 'undefined') return 'guest';
        let id = localStorage.getItem('soyol-guest-id');
        if (!id) {
            id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            localStorage.setItem('soyol-guest-id', id);
        }
        return id;
    });

    // Provide a minimal user-like object for guests
    const effectiveUser = user || { id: guestId, name: 'Зочин' };

    const [conversationId, setConversationId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'menu' | 'chat_selection' | 'video_selection' | 'chat' | 'video_call' | 'ai_chat'>('menu');
    const [connectingMode, setConnectingMode] = useState<'chat' | 'video_call' | null>(null);
    const [isVoiceCall, setIsVoiceCall] = useState(false);

    const connectToAdmin = async (mode: 'chat' | 'video_call') => {
        setConnectingMode(mode);
        try {
            if (mode === 'chat') {
                const res = await fetch('/api/messages/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject: 'Тусламжийн хүсэлт',
                        message: 'Сайн байна уу, надад тусламж хэрэгтэй байна.',
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setConversationId(data.conversationId);
                    setViewMode('chat');
                } else {
                    console.error('Failed to start conversation:', data.error);
                }
            } else {
                setViewMode(mode);
            }
        } catch (e) {
            console.error("Failed to connect to support", e);
        } finally {
            setConnectingMode(null);
        }
    };

    const handleBack = () => {
        if (viewMode === 'chat' || viewMode === 'video_call' || viewMode === 'ai_chat') {
            setViewMode('menu');
            setConversationId(null);
        } else {
            setViewMode('menu');
        }
    };

    const headerTitle = viewMode === 'menu'
        ? t('chat', 'greeting')
        : viewMode === 'chat'
            ? t('chat', 'supportTeam')
            : viewMode === 'ai_chat'
                ? t('chat', 'aiAssistant')
                : t('chat', 'selectOperator');

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed z-[100] bottom-24 right-4 md:right-28 w-[calc(100vw-16px)] sm:w-[400px] h-[85vh] sm:h-[min(640px,82vh)] bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] shadow-2xl shadow-black/40 flex flex-col overflow-hidden ring-1 ring-white/[0.04]"
                >
                    {/* Gradient accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF5000]/40 to-transparent" />

                    {/* Header */}
                    <div className="bg-slate-800/60 backdrop-blur-md px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            {viewMode !== 'menu' && (
                                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                                </button>
                            )}
                            {viewMode === 'menu' && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5000] to-orange-400 flex items-center justify-center shadow-md shadow-orange-500/15">
                                    <Headphones className="w-4 h-4 text-white" />
                                </div>
                            )}
                            <h3 className="font-bold text-white text-base">
                                {headerTitle}
                            </h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-95">
                            <X className="w-5 h-5 text-slate-400 hover:text-white" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative bg-transparent">
                        {viewMode === 'menu' ? (
                            <div className="flex flex-col gap-3 p-5 h-full justify-center">
                                {/* Decorative background */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5000]/[0.02] rounded-full blur-3xl pointer-events-none" />

                                {/* AI Assistant Option */}
                                <button
                                    onClick={() => setViewMode('ai_chat')}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-white/[0.06] hover:border-white/10 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/15 group-hover:shadow-blue-500/25 group-hover:scale-105 transition-all shrink-0">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="relative z-10 min-w-0">
                                        <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{t('chat', 'aiAssistant')}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{t('chat', 'askAi')}</p>
                                    </div>
                                </button>

                                {/* Chat with support */}
                                <button
                                    onClick={() => connectToAdmin('chat')}
                                    disabled={connectingMode !== null}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-white/[0.06] hover:border-white/10 transition-all group text-left relative overflow-hidden disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-[#FF5000]/10 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-[#FF5000] group-hover:to-orange-400 transition-all group-hover:shadow-lg group-hover:shadow-orange-500/15 group-hover:scale-105 relative z-10 shrink-0">
                                        {connectingMode === 'chat' ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <MessageCircle className="w-5 h-5 text-[#FF5000] group-hover:text-white" strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className="relative z-10 min-w-0">
                                        <h4 className="font-bold text-white">{t('chat', 'sendMessage')}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{t('chat', 'chatWithOperator')}</p>
                                    </div>
                                </button>

                                {/* Video Call */}
                                <button
                                    onClick={() => connectToAdmin('video_call')}
                                    disabled={connectingMode !== null}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-white/[0.06] hover:border-white/10 transition-all group text-left relative overflow-hidden disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-orange-600 transition-all group-hover:shadow-lg group-hover:shadow-amber-500/15 group-hover:scale-105 relative z-10 shrink-0">
                                        {connectingMode === 'video_call' && !isVoiceCall ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Video className="w-5 h-5 text-amber-500 group-hover:text-white" strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className="relative z-10 min-w-0">
                                        <h4 className="font-bold text-white">{t('chat', 'videoCall')}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{t('chat', 'joinByCode')}</p>
                                    </div>
                                </button>

                                {/* Voice Call */}
                                <button
                                    onClick={() => {
                                        setIsVoiceCall(true);
                                        connectToAdmin('video_call');
                                    }}
                                    disabled={connectingMode !== null}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-white/[0.06] hover:border-white/10 transition-all group text-left relative overflow-hidden disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-emerald-500 group-hover:to-teal-600 transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/15 group-hover:scale-105 relative z-10 shrink-0">
                                        {connectingMode === 'video_call' && isVoiceCall ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Phone className="w-5 h-5 text-emerald-500 group-hover:text-white" strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className="relative z-10 min-w-0">
                                        <h4 className="font-bold text-white">{t('chat', 'voiceCall')}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{t('chat', 'joinByCode')}</p>
                                    </div>
                                </button>
                            </div>
                        ) : viewMode === 'chat' && conversationId ? (
                            <SupportChatWindow
                                conversationId={conversationId}
                                onBack={handleBack}
                            />
                        ) : viewMode === 'ai_chat' ? (
                            <AIChatWindow onBack={handleBack} />
                        ) : viewMode === 'video_call' ? (
                            <div className="h-full overflow-y-auto bg-white">
                                <VideoCall
                                    prefilledRoom={`support-${effectiveUser.id}`}
                                    onBack={handleBack}
                                    initialVideoDisabled={isVoiceCall}
                                />
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
