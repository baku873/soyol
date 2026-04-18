'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Search, Filter, MessageSquare, Send, CheckCircle, AlertCircle, Clock, CheckSquare } from 'lucide-react';
import Ably from 'ably';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminMessagesDashboard() {
  const { isLoading, user, isAdmin } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [internalNote, setInternalNote] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);

  // Fetch queue
  const { data: queueData, mutate: mutateQueue } = useSWR(
    isAdmin ? `/api/admin/messages/conversations?filter=${filter}&search=${search}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  // Load specific conversation
  useEffect(() => {
    if (!selectedId) return;
    setLoadingConv(true);
    
    Promise.all([
      fetch(`/api/messages/conversations/${selectedId}`).then(res => res.json()),
      fetch(`/api/messages/conversations/${selectedId}/messages`).then(res => res.json())
    ]).then(([convData, msgData]) => {
      setConversation(convData.conversation);
      setMessages(msgData.messages || []);
      setLoadingConv(false);
      
      // Mark as read
      fetch(`/api/messages/conversations/${selectedId}/read`, { method: 'PUT' });
      mutateQueue();
    });

    const ably = new Ably.Realtime({ authUrl: '/api/ably/auth' });
    const channel = ably.channels.get(`conversation:${selectedId}`);
    channelRef.current = channel;
    
    channel.subscribe('new_message', (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message.data.id || m._id === message.data._id)) return prev;
        return [...prev, { ...message.data, _id: message.data.id }];
      });
      fetch(`/api/messages/conversations/${selectedId}/read`, { method: 'PUT' });
      mutateQueue();
    });

    const typingChannel = ably.channels.get(`typing:${selectedId}`);
    typingChannelRef.current = typingChannel;
    
    typingChannel.subscribe('typing', (msg) => {
      if (msg.data.userId !== user?.id && msg.data.isTyping) {
        setUserTyping(true);
        setTimeout(() => setUserTyping(false), 3000);
      }
    });

    return () => {
      channel.unsubscribe();
      typingChannel.unsubscribe();
      ably.close();
    };
  }, [selectedId, user]);

  const [loadingConv, setLoadingConv] = useState(false);

  // Admin global channel
  useEffect(() => {
    if (!isAdmin) return;
    const ably = new Ably.Realtime({ authUrl: '/api/ably/auth' });
    const globalChannel = ably.channels.get('admin:messages');
    globalChannel.subscribe('conversation_update', () => {
      mutateQueue();
    });
    return () => {
      globalChannel.unsubscribe();
      ably.close();
    };
  }, [isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedId) return;

    setSending(true);
    const tempId = Date.now().toString();
    const newMsg = {
      _id: tempId,
      senderId: user!.id,
      senderType: 'admin',
      body: newMessage,
      isInternal: internalNote,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const endpoint = internalNote 
        ? `/api/admin/messages/conversations/${selectedId}/notes`
        : `/api/messages/conversations/${selectedId}/messages`;
      
      const body = internalNote ? { note: messageToSend } : { message: messageToSend };

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      mutateQueue();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, isTyping: true })
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, isTyping: false })
      });
    }, 2000);
  };

  const handleAssign = async () => {
    await fetch(`/api/admin/messages/conversations/${selectedId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedAdminId: user?.id })
    });
    mutateQueue();
    setConversation((prev: any) => ({ ...prev, assignedAdminId: user?.id }));
  };

  const handleResolve = async () => {
    await fetch(`/api/admin/messages/conversations/${selectedId}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    mutateQueue();
    setConversation((prev: any) => ({ ...prev, status: 'resolved' }));
  };

  if (isLoading || !isAdmin) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

  const conversations = queueData?.conversations || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex">
      {/* Queue Sidebar */}
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-slate-900 shrink-0">
        <div className="p-4 border-b border-white/10 bg-slate-800/50">
          <h2 className="text-xl font-bold text-white mb-4">Support Queue</h2>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search subject..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'unread', 'unassigned', 'my', 'resolved'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize transition ${filter === f ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <div className="p-4 text-center text-slate-500 text-sm mt-10">No conversations found.</div>}
          {conversations.map((conv: any) => (
            <div 
              key={conv._id} 
              onClick={() => setSelectedId(conv._id)}
              className={`p-4 border-b border-white/5 cursor-pointer transition ${selectedId === conv._id ? 'bg-slate-800' : 'hover:bg-slate-800/50'} ${conv.unreadByAdmin > 0 ? 'border-l-4 border-l-amber-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-sm truncate pr-4 ${conv.unreadByAdmin > 0 ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                  {conv.priority === 'urgent' && <AlertCircle className="w-3 h-3 inline text-red-500 mr-1" />}
                  {conv.subject}
                </h3>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(conv.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-xs text-slate-400 truncate mb-2">{conv.lastMessagePreview}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5">{conv.user?.name || 'User'}</span>
                {conv.status === 'resolved' && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Resolved</span>}
                {!conv.assignedAdminId && <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-500">Unassigned</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Thread Area */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {loadingConv ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : !selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p>Select a conversation to view details.</p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <header className="border-b border-white/10 p-4 bg-slate-800/50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">{conversation?.subject}</h2>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="text-slate-400">User: <span className="text-slate-200">{conversation?.userId}</span></span>
                  <span className="text-slate-400">Status: <span className={`uppercase font-medium ${conversation?.status === 'resolved' ? 'text-emerald-500' : 'text-amber-500'}`}>{conversation?.status}</span></span>
                  <span className="text-slate-400">Priority: <span className="uppercase text-slate-200">{conversation?.priority}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!conversation?.assignedAdminId && (
                  <button onClick={handleAssign} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded hover:bg-blue-500/30 transition">
                    Assign to me
                  </button>
                )}
                {conversation?.status !== 'resolved' && (
                  <button onClick={handleResolve} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded flex items-center gap-1 hover:bg-emerald-500/30 transition">
                    <CheckCircle className="w-3 h-3" /> Resolve
                  </button>
                )}
              </div>
            </header>

            {/* Thread Body */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isAdmin = msg.senderType === 'admin';
                return (
                  <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.isInternal 
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 rounded-br-none'
                        : isAdmin 
                          ? 'bg-amber-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'
                    }`}>
                      {msg.isInternal && <p className="text-[10px] uppercase font-bold text-purple-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Internal Note</p>}
                      {!isAdmin && <p className="text-[10px] uppercase font-bold text-amber-500 mb-1">Customer</p>}
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <span className="text-[10px] opacity-60 mt-1 block text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              {userTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-sm italic border border-white/5">
                    Customer is typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </main>

            {/* Thread Input */}
            <div className="p-4 bg-slate-800/50 border-t border-white/10 shrink-0">
              <form onSubmit={handleSend} className="flex flex-col gap-2">
                <div className="flex items-center gap-4 px-2 mb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition">
                    <input type="checkbox" checked={internalNote} onChange={e => setInternalNote(e.target.checked)} className="rounded bg-slate-900 border-white/10 text-purple-500 focus:ring-purple-500" />
                    Internal Note (Private)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder={internalNote ? "Type a private note..." : "Type a reply to the customer..."}
                    className={`flex-1 bg-slate-900 border px-4 py-3 text-white placeholder-slate-500 focus:outline-none rounded-xl transition ${internalNote ? 'border-purple-500/50 focus:border-purple-500' : 'border-white/10 focus:border-amber-500'}`}
                    disabled={conversation?.status === 'resolved'}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || conversation?.status === 'resolved'}
                    className={`p-3 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${internalNote ? 'bg-purple-500 hover:bg-purple-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
