'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Send, Loader2, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Ably from 'ably';

interface Message {
  _id: string;
  senderId: string;
  senderType: 'user' | 'admin';
  body: string;
  createdAt: string;
  attachments?: any[];
}

export default function MessageThread() {
  const { isLoading, user } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    // Fetch conversation & messages
    Promise.all([
      fetch(`/api/messages/conversations/${id}`).then(res => res.json()),
      fetch(`/api/messages/conversations/${id}/messages`).then(res => res.json())
    ]).then(([convData, msgData]) => {
      if (convData.conversation) setConversation(convData.conversation);
      if (msgData.messages) setMessages(msgData.messages);
      setLoading(false);
      
      // Mark as read
      fetch(`/api/messages/conversations/${id}/read`, { method: 'PUT' });
    });

    // Ably Realtime Setup
    const ably = new Ably.Realtime({ authUrl: '/api/ably/auth' }); // Assuming an auth route exists, else we need to use a key or proper auth. Wait, checking if /api/ably/auth exists.

    const channel = ably.channels.get(`conversation:${id}`);
    channel.subscribe('new_message', (message) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m._id === message.data.id || m._id === message.data._id)) return prev;
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, adminTyping]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, isTyping: true })
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, isTyping: false })
      });
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const tempId = Date.now().toString();
    const newMsg: Message = {
      _id: tempId,
      senderId: user!.id,
      senderType: 'user',
      body: newMessage,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      await fetch(`/api/messages/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend })
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally remove optimistic message
    } finally {
      setSending(false);
    }
  };

  if (isLoading || loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/messages" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">{conversation?.subject || 'Support Ticket'}</h1>
              <p className="text-xs text-slate-400">Status: <span className="uppercase text-amber-500">{conversation?.status}</span></p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 h-[calc(100vh-80px)]">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.map((msg) => {
            const isMe = msg.senderType === 'user';
            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isMe 
                    ? 'bg-amber-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {!isMe && <p className="text-[10px] uppercase font-bold text-amber-500 mb-1">Support Agent</p>}
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                  <span className="text-[10px] opacity-60 mt-1 block text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {adminTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-sm italic border border-white/5">
                Support is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="bg-slate-800/50 p-2 rounded-2xl border border-white/10 flex gap-2 shrink-0 items-center">
          <button type="button" className="p-2 text-slate-400 hover:text-white transition">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none px-4 py-2 text-white placeholder-slate-500 focus:outline-none"
            disabled={conversation?.status === 'closed' || conversation?.status === 'resolved'}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || conversation?.status === 'closed'}
            className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>
    </div>
  );
}
