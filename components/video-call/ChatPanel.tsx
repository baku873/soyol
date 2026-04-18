/**
 * ChatPanel Component
 * In-call chat panel displayed alongside the video grid.
 * Uses the useRoomChat hook for real-time messaging.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/types/chat-message';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (body: string) => void;
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  isLoading: boolean;
  currentUserId: string;
  error: string | null;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isOpen,
  onClose,
  unreadCount: _unreadCount,
  isLoading,
  currentUserId,
  error,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900/95 backdrop-blur-xl border-l border-white/10 absolute right-0 top-0 bottom-0 z-40 md:relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-white text-sm">Чат</h3>
          <span className="text-xs text-slate-400">({messages.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Мессеж байхгүй байна</p>
            <p className="text-slate-600 text-xs mt-1">Эхний мессежээ илгээгээрэй</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  isMe
                    ? 'bg-orange-500 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5'
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-bold text-orange-400 mb-0.5">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm leading-relaxed break-words">{msg.body}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span
                    className={`text-[9px] ${isMe ? 'text-white/50' : 'text-slate-500'}`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && msg.status === 'sending' && (
                    <Loader2 className="w-2.5 h-2.5 text-white/50 animate-spin" />
                  )}
                  {isMe && msg.status === 'failed' && (
                    <AlertCircle className="w-2.5 h-2.5 text-red-300" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Мессеж бичих..."
            className="flex-1 bg-slate-800 border-none rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:ring-1 focus:ring-orange-500/50 outline-none"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
