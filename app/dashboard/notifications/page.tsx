'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Mail, Bell, BellOff, CheckCircle, XCircle, Clock,
  Loader2, Send, Zap, ShoppingBag,
} from 'lucide-react';

interface EmailPrefs {
  subscribedToEmails: boolean;
  email: string;
  name: string;
  avatar: string | null;
  recentEmails: {
    id: string;
    type: string;
    subject: string;
    status: string;
    sentAt: string;
  }[];
}

export default function DashboardNotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [sendingFlash, setSendingFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/email-preferences');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrefs(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchPrefs();
  }, [isAuthenticated, fetchPrefs]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  /* Toggle subscription */
  const handleToggle = async () => {
    if (!prefs) return;
    setToggling(true);
    try {
      const res = await fetch('/api/notifications/email-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribedToEmails: !prefs.subscribedToEmails }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs((p) => p ? { ...p, subscribedToEmails: data.subscribedToEmails } : p);
        showToast(data.subscribedToEmails ? '✅ Subscribed to promotional emails' : '🔕 Unsubscribed from promotional emails');
      }
    } catch {
      showToast('❌ Failed to update preferences');
    } finally {
      setToggling(false);
    }
  };

  /* Test: Send Welcome */
  const handleSendWelcome = async () => {
    if (!user) return;
    setSendingWelcome(true);
    try {
      const res = await fetch('/api/notifications/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.queued ? '📬 Welcome email queued!' : '✅ Welcome email sent! Check your inbox.');
        fetchPrefs();
      } else {
        showToast(`❌ ${data.error}`);
      }
    } catch {
      showToast('❌ Failed to send email');
    } finally {
      setSendingWelcome(false);
    }
  };

  /* Test: Send Flash Sale */
  const handleSendFlash = async () => {
    if (!user) return;
    setSendingFlash(true);
    try {
      const res = await fetch('/api/notifications/send-flash-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [user.id] }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Flash sale email sent! (${data.sendingNow} sent, ${data.queued} queued)`);
        fetchPrefs();
      } else {
        showToast(`❌ ${data.error}`);
      }
    } catch {
      showToast('❌ Failed to send email');
    } finally {
      setSendingFlash(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Нэвтрэх шаардлагатай.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-gray-900 text-white rounded-xl shadow-2xl text-sm font-medium animate-fade-in border border-gray-700">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <Mail className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Preferences</h1>
          <p className="text-gray-500 text-sm">Manage promotional email notifications</p>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {(user.avatar || user.imageUrl) ? (
            <img
              src={user.avatar || user.imageUrl}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-orange-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
              {user.name?.[0] || '?'}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{user.name}</p>
            <p className="text-gray-500 text-sm">{user.email || 'No email'}</p>
          </div>
        </div>
      </div>

      {/* Subscription Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {prefs?.subscribedToEmails ? (
              <Bell className="w-5 h-5 text-emerald-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-semibold text-gray-900">Promotional Emails</p>
              <p className="text-gray-500 text-xs">Flash sales, deals, and special offers</p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
              prefs?.subscribedToEmails ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
              prefs?.subscribedToEmails ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider mb-3">
          Test Email Delivery
        </h3>
        <button
          onClick={handleSendWelcome}
          disabled={sendingWelcome || !user.email}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-colors"
        >
          {sendingWelcome ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><ShoppingBag className="w-4 h-4" /> Send me a Welcome Email</>
          )}
        </button>
        <button
          onClick={handleSendFlash}
          disabled={sendingFlash || !user.email}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-colors"
        >
          {sendingFlash ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Zap className="w-4 h-4" /> Send me a Flash Sale Email</>
          )}
        </button>
        {!user.email && (
          <p className="text-center text-gray-400 text-xs">Email required to test sending</p>
        )}
      </div>

      {/* Recent Emails */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Emails</h3>
        </div>
        {(!prefs?.recentEmails || prefs.recentEmails.length === 0) ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No emails sent to you yet
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {prefs.recentEmails.map((email) => (
              <div key={email.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500">
                      {email.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(email.sentAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  {email.status === 'sent' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {email.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                  {email.status === 'queued' && <Clock className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
