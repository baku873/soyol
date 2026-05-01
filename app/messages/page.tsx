'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  MessageSquare,
  Plus,
  Loader2,
  ArrowRight,
  Search,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  CircleDot,
  AlertTriangle,
  Inbox,
  Sparkles,
  HeadphonesIcon,
} from 'lucide-react';
import { formatRelative } from '@/lib/messageUtils';

interface Conversation {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadByUser: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bg: string; glow: string }
> = {
  open: {
    icon: <CircleDot className="w-3 h-3" />,
    label: 'Open',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    glow: 'shadow-emerald-500/5',
  },
  active: {
    icon: <Clock className="w-3 h-3" />,
    label: 'Active',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    glow: 'shadow-blue-500/5',
  },
  resolved: {
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Resolved',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    glow: 'shadow-amber-500/5',
  },
  closed: {
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Closed',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    glow: '',
  },
};

const defaultStatus = {
  icon: <CircleDot className="w-3 h-3" />,
  label: 'Unknown',
  color: 'text-slate-400',
  bg: 'bg-slate-500/10 border-slate-500/20',
  glow: '',
};

function SkeletonCard() {
  return (
    <div className="bg-slate-800/60 p-5 rounded-2xl border border-white/5 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 w-2/3 bg-slate-700 rounded-lg" />
        <div className="h-5 w-16 bg-slate-700 rounded-full" />
      </div>
      <div className="h-4 w-4/5 bg-slate-700/50 rounded-lg mb-3" />
      <div className="h-3 w-20 bg-slate-700/30 rounded-lg" />
    </div>
  );
}

export default function MessagesList() {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const { data, error, mutate } = useSWR(
    user ? '/api/messages/conversations' : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect unauthenticated users to sign-up
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/sign-up');
    }
  }, [isLoading, user, router]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    if (showModal) {
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [showModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, priority }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setSubject('');
        setMessage('');
        setPriority('normal');
        mutate();
        router.push(`/messages/${json.conversationId}`);
      } else {
        setSubmitError(json.error || 'Failed to create ticket. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setSubmitError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const conversations: Conversation[] = data?.conversations || [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  if (isLoading || !user)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/8 via-transparent to-slate-900" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <HeadphonesIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Support
                </h1>
              </div>
              <p className="text-sm text-slate-400 mt-1 pl-[52px] sm:pl-0">
                {conversations.length > 0
                  ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                  : 'We\'re here to help'}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.97] text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              New Ticket
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
        {/* Search */}
        {conversations.length > 0 && (
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject or message..."
              className="w-full bg-slate-800/60 border border-white/[0.06] rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 focus:bg-slate-800 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {/* Loading skeleton */}
          {!data && !error && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Empty state */}
          {conversations.length === 0 && data && (
            <div className="text-center py-20 relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                <MessageSquare className="w-64 h-64" />
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-white/5 shadow-xl">
                  <Inbox className="w-9 h-9 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  No conversations yet
                </h2>
                <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">
                  Our support team is standing by. Start a conversation and we&apos;ll get back to you quickly.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500 transition-all active:scale-[0.97]"
                >
                  <Sparkles className="w-4 h-4" />
                  Start Your First Conversation
                </button>
              </div>
            </div>
          )}

          {/* Conversation cards */}
          {filtered.map((conv, i) => {
            const status = statusConfig[conv.status] || defaultStatus;
            const hasUnread = conv.unreadByUser > 0;

            return (
              <Link
                href={`/messages/${conv._id}`}
                key={conv._id}
                className={`group block relative bg-slate-800/50 hover:bg-slate-800/80 rounded-2xl border transition-all duration-200 overflow-hidden ${
                  hasUnread
                    ? 'border-amber-500/20 shadow-lg shadow-amber-500/5'
                    : 'border-white/[0.06] hover:border-white/10'
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Unread indicator bar */}
                {hasUnread && (
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-amber-500 to-orange-600" />
                )}

                <div className="p-4 sm:p-5">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className={`font-semibold group-hover:text-amber-400 transition-colors truncate flex-1 ${hasUnread ? 'text-white' : 'text-slate-200'}`}>
                      {conv.subject}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {conv.priority && conv.priority !== 'normal' && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15 uppercase tracking-wider font-bold">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {conv.priority}
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${status.bg} ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <p className={`text-sm truncate pr-8 ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                    {conv.lastMessagePreview || 'No messages yet'}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">
                      {formatRelative(new Date(conv.lastMessageAt))}
                    </span>
                    {hasUnread && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-bold rounded-full shadow-sm shadow-amber-500/30">
                        {conv.unreadByUser}
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2 group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-200 opacity-0 group-hover:opacity-100" />
              </Link>
            );
          })}

          {searchQuery && filtered.length === 0 && conversations.length > 0 && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                No tickets match &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative w-full sm:max-w-lg bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    New Conversation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Our team typically replies within a few hours</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitError && (
                <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/15 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-400 uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full bg-slate-800/80 border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-colors text-sm"
                    placeholder="What do you need help with?"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-400 uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('normal')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        priority === 'normal'
                          ? 'bg-slate-700 border-white/10 text-white'
                          : 'bg-transparent border-white/[0.06] text-slate-400 hover:border-white/10'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('urgent')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        priority === 'urgent'
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'bg-transparent border-white/[0.06] text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Urgent
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-400 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-slate-800/80 border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-colors resize-none text-sm leading-relaxed"
                    placeholder="Describe your issue in detail..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 sm:flex-none px-5 py-3 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !subject.trim() || !message.trim()}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm shadow-lg shadow-amber-500/15 active:scale-[0.97]"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                      </span>
                    ) : (
                      'Submit Ticket'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
