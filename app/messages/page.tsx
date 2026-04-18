'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Plus, Loader2, ArrowRight } from 'lucide-react';

interface Conversation {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadByUser: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MessagesList() {
  const { isLoading, user } = useAuth();
  const { data, error, mutate } = useSWR(user ? '/api/messages/conversations' : null, fetcher, { refreshInterval: 5000 });
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, priority })
      });
      const json = await res.json();
      if (json.success) {
        setShowNew(false);
        setSubject('');
        setMessage('');
        setPriority('normal');
        mutate();
        // Redirect to new conversation or just refresh list
        window.location.href = `/messages/${json.conversationId}`;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const conversations: Conversation[] = data?.conversations || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-amber-500" /> Support Tickets
          </h1>
          <button 
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
          >
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        </div>

        {showNew && (
          <div className="bg-slate-800 p-6 rounded-2xl mb-8 border border-white/5">
            <h2 className="text-lg font-bold text-white mb-4">Start New Conversation</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2">
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2"></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {!data && !error && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>}
          {conversations.length === 0 && data && !showNew && (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-white/5">
              <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-lg text-slate-300">No support tickets found.</p>
              <button onClick={() => setShowNew(true)} className="mt-4 text-amber-500 hover:underline">Start a conversation</button>
            </div>
          )}
          {conversations.map(conv => (
            <Link href={`/messages/${conv._id}`} key={conv._id} className="block bg-slate-800 p-4 rounded-xl border border-white/5 hover:border-amber-500/50 transition relative overflow-hidden group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition">{conv.subject}</h3>
                <div className="flex items-center gap-2">
                  {conv.unreadByUser > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{conv.unreadByUser} new</span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wide font-medium ${
                    conv.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' :
                    conv.status === 'active' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>{conv.status}</span>
                </div>
              </div>
              <p className="text-sm text-slate-400 truncate pr-8">{conv.lastMessagePreview}</p>
              <p className="text-xs text-slate-500 mt-2">{new Date(conv.lastMessageAt).toLocaleString()}</p>
              <ArrowRight className="w-5 h-5 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2 group-hover:text-amber-500 group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
