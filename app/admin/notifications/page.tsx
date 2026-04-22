'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Mail, Send, Users, AlertTriangle, CheckCircle, XCircle,
  Clock, Zap, Loader2, RefreshCw, ChevronRight,
} from 'lucide-react';

/* ─── Types ─── */
interface EmailStats {
  dailyLimit: number;
  sentToday: number;
  totalSent: number;
  totalFailed: number;
  pendingQueue: number;
  totalUsers: number;
  subscribedUsers: number;
  recentLogs: {
    id: string;
    userId: string;
    type: string;
    subject: string;
    status: string;
    sentAt: string;
    error?: string;
  }[];
}

/* ─── Main Page ─── */
export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingFlashSale, setSendingFlashSale] = useState(false);
  const [flashResult, setFlashResult] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [queueResult, setQueueResult] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/email-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  /* ─── Send Flash Sale to ALL ─── */
  const handleSendFlashSale = async () => {
    setShowConfirmDialog(false);
    setSendingFlashSale(true);
    setFlashResult(null);
    try {
      const res = await fetch('/api/notifications/send-flash-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setFlashResult(`✅ Sent: ${data.sendingNow} | Queued: ${data.queued} | Total targets: ${data.totalTargets}`);
        fetchStats();
      } else {
        setFlashResult(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setFlashResult(`❌ ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setSendingFlashSale(false);
    }
  };

  /* ─── Process Queue ─── */
  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    setQueueResult(null);
    try {
      const res = await fetch('/api/notifications/process-queue');
      const data = await res.json();
      if (res.ok) {
        setQueueResult(`✅ Processed: ${data.processed} | Sent: ${data.sent} | Failed: ${data.failed}`);
        fetchStats();
      } else {
        setQueueResult(`❌ ${data.error || data.message}`);
      }
    } catch (err) {
      setQueueResult(`❌ ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setProcessingQueue(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 h-full overflow-y-auto bg-slate-950">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  const usagePercent = stats ? Math.round((stats.sentToday / stats.dailyLimit) * 100) : 0;
  const isNearLimit = stats ? stats.sentToday > 80 : false;
  const isAtLimit = stats ? stats.sentToday >= stats.dailyLimit : false;

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto scrollbar-hide bg-slate-950">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-amber-500" />
            Email Campaigns
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage promotional emails — Resend free tier (100/day)
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      {/* Warning Banner */}
      {isNearLimit && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          isAtLimit
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">
            {isAtLimit
              ? `Daily limit reached (${stats?.sentToday}/${stats?.dailyLimit}). New emails will be queued for tomorrow.`
              : `Approaching daily limit: ${stats?.sentToday}/${stats?.dailyLimit} emails sent today.`}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Send className="w-5 h-5" />}
          label="Sent Today"
          value={`${stats?.sentToday ?? 0} / ${stats?.dailyLimit ?? 90}`}
          color="amber"
          subtext={`${usagePercent}% used`}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Subscribers"
          value={`${stats?.subscribedUsers ?? 0}`}
          color="emerald"
          subtext={`of ${stats?.totalUsers ?? 0} total users`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Queued"
          value={`${stats?.pendingQueue ?? 0}`}
          color="blue"
          subtext="pending emails"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="Failed"
          value={`${stats?.totalFailed ?? 0}`}
          color="red"
          subtext="all time"
        />
      </div>

      {/* Daily Send Meter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Daily Send Meter</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
            isAtLimit
              ? 'bg-red-500/20 text-red-400'
              : isNearLimit
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {stats?.sentToday ?? 0} / {stats?.dailyLimit ?? 90}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs mt-2">
          Resend free tier: 100 emails/day. Buffer: 10 reserved for transactional.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flash Sale */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Flash Sale Campaign</h3>
              <p className="text-slate-500 text-xs">Send to all subscribed users</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={sendingFlashSale}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-bold transition-colors"
          >
            {sendingFlashSale ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4" /> Send Flash Sale to ALL</>
            )}
          </button>
          {flashResult && (
            <p className="text-xs text-slate-400 bg-slate-800 rounded-lg p-2">{flashResult}</p>
          )}
        </div>

        {/* Process Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Process Queue</h3>
              <p className="text-slate-500 text-xs">{stats?.pendingQueue ?? 0} emails waiting</p>
            </div>
          </div>
          <button
            onClick={handleProcessQueue}
            disabled={processingQueue || (stats?.pendingQueue ?? 0) === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-bold transition-colors"
          >
            {processingQueue ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Process Queue Now</>
            )}
          </button>
          {queueResult && (
            <p className="text-xs text-slate-400 bg-slate-800 rounded-lg p-2">{queueResult}</p>
          )}
        </div>
      </div>

      {/* Recent Email Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-white font-semibold">Recent Email Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider bg-slate-950/50">
                <th className="p-4 border-b border-slate-800">Type</th>
                <th className="p-4 border-b border-slate-800">Subject</th>
                <th className="p-4 border-b border-slate-800">Status</th>
                <th className="p-4 border-b border-slate-800">Time</th>
              </tr>
            </thead>
            <tbody>
              {(!stats?.recentLogs || stats.recentLogs.length === 0) ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    No emails sent yet
                  </td>
                </tr>
              ) : (
                stats.recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 capitalize">
                        {log.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-300 max-w-[200px] truncate">
                      {log.subject}
                    </td>
                    <td className="p-4">
                      {log.status === 'sent' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Sent
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-400" title={log.error}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                      {log.status === 'queued' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                          <Clock className="w-3.5 h-3.5" /> Queued
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Send Flash Sale to ALL?</h3>
              <p className="text-slate-400 text-sm">
                This will send a promotional email to <strong className="text-white">{stats?.subscribedUsers ?? 0}</strong> subscribed users.
                {(stats?.subscribedUsers ?? 0) > (stats?.dailyLimit ?? 90) && (
                  <span className="block mt-2 text-amber-400">
                    ⚠️ Exceeds daily limit. {(stats?.subscribedUsers ?? 0) - (stats?.dailyLimit ?? 90)} emails will be queued.
                  </span>
                )}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendFlashSale}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Confirm Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  icon, label, value, color, subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'amber' | 'emerald' | 'blue' | 'red';
  subtext: string;
}) {
  const colors = {
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white text-2xl font-black">{value}</p>
      <p className="text-slate-500 text-xs mt-1">{subtext}</p>
    </div>
  );
}
