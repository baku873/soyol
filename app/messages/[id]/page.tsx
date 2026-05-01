'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Send, Loader2, ChevronDown, Lock, AlertTriangle, Headphones, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Ably from 'ably';
import { buildTimeline } from '@/lib/messageUtils';

interface Message {
  _id: string;
  senderId: string;
  senderType: 'user' | 'admin';
  body: string;
  createdAt: string;
  attachments?: any[];
  failed?: boolean;
}

export default function MessageThread() {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Redirect unauthenticated users to sign-up
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/sign-up');
    }
  }, [isLoading, user, router]);

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isClosed =
    conversation?.status === 'closed' || conversation?.status === 'resolved';

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  // Scroll handling
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
    if (!id || !user) return;

    Promise.all([
      fetch(`/api/messages/conversations/${id}`).then((res) => res.json()),
      fetch(`/api/messages/conversations/${id}/messages`).then((res) =>
        res.json()
      ),
    ]).then(([convData, msgData]) => {
      if (convData.conversation) setConversation(convData.conversation);
      if (msgData.messages) setMessages(msgData.messages);
      setLoading(false);

      fetch(`/api/messages/conversations/${id}/read`, { method: 'PUT' });
    });

    // Ably Realtime Setup
    const ably = new Ably.Realtime({ authUrl: '/api/ably/auth' });

    const channel = ably.channels.get(`conversation:${id}`);
    channel.subscribe('new_message', (message) => {
      setMessages((prev) => {
        if (
          prev.some(
            (m) =>
              m._id === message.data.id || m._id === message.data._id
          )
        )
          return prev;
        return [...prev, { ...message.data, _id: message.data.id }];
      });
      fetch(`/api/messages/conversations/${id}/read`, { method: 'PUT' });
    });

    const typingChannel = ably.channels.get(`typing:${id}`);
    typingChannel.subscribe('typing', (msg) => {
      if (msg.data.userId !== user.id && msg.data.isTyping) {
        setAdminTyping(true);
        setTimeout(() => setAdminTyping(false), 3000);
      }
    });

    return () => {
      channel.unsubscribe();
      typingChannel.unsubscribe();
      ably.close();
    };
  }, [id, user]);

  // Scroll on new messages
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 300) {
      scrollToBottom();
    }
  }, [messages, adminTyping, scrollToBottom]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('instant');
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    autoResize();

    if (!isTyping) {
      setIsTyping(true);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, isTyping: true }),
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, isTyping: false }),
      });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async (retryBody?: string) => {
    const body = retryBody || newMessage;
    if (!body.trim() || sending) return;

    setSending(true);
    const tempId = Date.now().toString();
    const newMsg: Message = {
      _id: tempId,
      senderId: user!.id,
      senderType: 'user',
      body: body,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!retryBody) {
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    try {
      const res = await fetch(`/api/messages/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      });
      if (!res.ok) throw new Error('Send failed');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, failed: true } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleRetry = (msg: Message) => {
    setMessages((prev) => prev.filter((m) => m._id !== msg._id));
    setNewMessage(msg.body);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  if (isLoading || !user || loading)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-sm text-slate-500">Loading conversation...</p>
        </div>
      </div>
    );

  const timeline = buildTimeline(messages);

  const statusColor =
    conversation?.status === 'open'
      ? 'bg-emerald-500'
      : conversation?.status === 'active'
        ? 'bg-blue-500'
        : conversation?.status === 'resolved'
          ? 'bg-amber-500'
          : 'bg-slate-500';

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-slate-900/95 backdrop-blur-xl shrink-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/messages"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/15">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColor} rounded-full border-2 border-slate-900`} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {conversation?.subject || 'Support Ticket'}
              </h1>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                <span className="text-xs text-slate-400 capitalize">
                  {conversation?.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden relative">
        {/* Subtle gradient overlay at top for depth */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
        >
          {/* Empty state for new conversations */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/5 flex items-center justify-center mb-4 shadow-xl">
                <Headphones className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-medium text-slate-300">Conversation started</p>
              <p className="text-sm text-slate-500 mt-1">Our team will respond shortly</p>
            </div>
          )}

          {timeline.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div
                  key={`date-${idx}`}
                  className="flex justify-center my-6"
                >
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-800/90 px-4 py-1.5 rounded-full border border-white/[0.06] backdrop-blur-sm">
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
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {/* Admin avatar */}
                {!isMe && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center mr-2.5 mt-auto mb-1 shrink-0 border border-amber-500/10">
                    <Headphones className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[78%] sm:max-w-[70%]`}>
                  {/* Agent label */}
                  {!isMe && (
                    <span className="text-[10px] uppercase font-semibold text-amber-500/80 mb-1.5 tracking-wider px-1">
                      Support
                    </span>
                  )}

                  {group.messages.map((msg, msgIdx) => {
                    const isFirst = msgIdx === 0;
                    const isLast = msgIdx === group.messages.length - 1;
                    const typedMsg = msg as Message;

                    // Bubble radius logic for grouped messages
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
                        className={`px-4 py-2.5 ${bubbleRadius} ${
                          isMe
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/10'
                            : 'bg-slate-800/80 text-slate-200 border border-white/[0.06]'
                        } ${msgIdx > 0 ? 'mt-[2px]' : ''} ${typedMsg.failed ? 'opacity-60' : ''}`}
                      >
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{typedMsg.body}</p>

                        {typedMsg.failed && (
                          <button
                            onClick={() => handleRetry(typedMsg)}
                            className="flex items-center gap-1 text-[11px] mt-1.5 text-red-200 hover:text-white transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Failed to send · Tap to retry
                          </button>
                        )}

                        {isLast && !typedMsg.failed && (
                          <div className={`flex items-center gap-1 justify-end mt-1`}>
                            <span className={`text-[10px] ${isMe ? 'text-white/50' : 'text-slate-500'}`}>
                              {new Date(typedMsg.createdAt).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                            {isMe && (
                              <CheckCheck className={`w-3.5 h-3.5 ${typedMsg.failed === undefined ? 'text-white/40' : 'text-white/30'}`} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {adminTyping && (
            <div className="flex justify-start mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center mr-2.5 mt-auto mb-1 shrink-0 border border-amber-500/10">
                <Headphones className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="bg-slate-800/80 rounded-2xl rounded-bl-md px-5 py-3.5 border border-white/[0.06] flex items-center gap-[5px]">
                <span
                  className="w-[6px] h-[6px] bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms', animationDuration: '0.8s' }}
                />
                <span
                  className="w-[6px] h-[6px] bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms', animationDuration: '0.8s' }}
                />
                <span
                  className="w-[6px] h-[6px] bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms', animationDuration: '0.8s' }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom FAB */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-4 sm:right-6 z-10 p-2.5 bg-slate-800/90 border border-white/10 rounded-full shadow-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all backdrop-blur-sm hover:scale-105 active:scale-95"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}

        {/* Input area */}
        <div className="shrink-0 px-4 sm:px-6 pb-4 sm:pb-5 pt-2 bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/80">
          {isClosed ? (
            <div className="flex items-center gap-3 bg-slate-800/60 border border-white/[0.06] text-slate-400 rounded-2xl px-5 py-4 text-sm">
              <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-slate-300">Conversation {conversation?.status}</p>
                <p className="text-xs text-slate-500 mt-0.5">Open a new ticket to continue</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 rounded-2xl border border-white/[0.06] overflow-hidden transition-all focus-within:border-amber-500/20 focus-within:bg-slate-800/60">
              <div className="flex items-end gap-2 p-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none resize-none max-h-40 text-sm leading-relaxed"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-amber-500/15 active:scale-95 disabled:shadow-none"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 px-5 pb-2 select-none">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
