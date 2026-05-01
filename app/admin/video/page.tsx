'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Types ─── */
interface RoomInfo {
  name: string;
  unitId: string;
  numParticipants: number;
  creationTime: number;
}

interface SupportRoomInfo {
  name: string;
  clientId: string;
  numParticipants: number;
  creationTime: number;
}

/* ─── Main Dashboard ─── */
export default function AdminVideoPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [supportRooms, setSupportRooms] = useState<SupportRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  /* Fetch rooms — called every 5 seconds */
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/livekit/rooms');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRooms(data.unitRooms ?? []);
      setSupportRooms(data.supportRooms ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  /* Poll rooms every 5s */
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  /* Tick for elapsed time display — every 1s */
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen font-mono relative" style={{ background: '#080c0a', fontFamily: 'var(--font-jetbrains, monospace)' }}>
      {/* Background dot pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Header */}
      <header className="relative z-10 border-b border-emerald-900/30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-emerald-400 uppercase tracking-[0.3em] text-sm">
                Command Center
              </h1>
            </div>
            <span className="text-emerald-900 text-xs">|</span>
            <span className="text-emerald-700 uppercase tracking-[0.3em] text-[10px]">
              Unit Dashboard
            </span>
          </div>
          <div className="text-emerald-800 text-[10px] uppercase tracking-[0.3em] flex items-center gap-4">
            {supportRooms.length > 0 && (
                <span className="text-orange-500 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    {supportRooms.length} Waiting
                </span>
            )}
            <span>{rooms.length} unit{rooms.length !== 1 ? 's' : ''} online</span>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="relative z-10 max-w-5xl mx-auto px-6 mt-4">
          <div className="flex items-center gap-3 px-4 py-3 border border-red-900/50 bg-red-950/20">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-400 text-xs uppercase tracking-[0.2em]">{error}</span>
            <button
              onClick={fetchRooms}
              className="ml-auto text-red-500 text-[10px] uppercase tracking-[0.3em] hover:text-red-400 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          /* Loading skeletons */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-emerald-900/20 bg-emerald-950/10 p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-10 bg-emerald-900/30" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-emerald-900/20 rounded-sm" />
                      <div className="h-2 w-48 bg-emerald-900/10 rounded-sm" />
                    </div>
                  </div>
                  <div className="h-8 w-28 bg-emerald-900/20 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {/* SECTION 1 — Waiting Support Calls */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex h-3 w-3">
                  {supportRooms.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${supportRooms.length > 0 ? 'bg-orange-500' : 'bg-slate-700'}`}></span>
                </div>
                <h2 className={`text-sm uppercase tracking-[0.2em] font-bold ${supportRooms.length > 0 ? 'text-orange-500' : 'text-slate-600'}`}>
                  Waiting Support Calls
                </h2>
                {supportRooms.length > 0 && (
                    <span className="bg-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded-full border border-orange-500/30">
                        {supportRooms.length}
                    </span>
                )}
              </div>

              {supportRooms.length === 0 ? (
                <div className="border border-slate-800/50 bg-slate-900/20 py-8 px-6 text-center">
                  <p className="text-slate-600 text-xs uppercase tracking-[0.2em]">No clients waiting</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supportRooms.map((room) => {
                    const elapsed = formatElapsed(room.creationTime, tick);
                    return (
                      <div
                        key={room.name}
                        className="group flex items-center border border-orange-900/30 bg-orange-950/10 hover:bg-orange-950/20 hover:border-orange-500/50 transition-all duration-200"
                      >
                        <div className="w-1 self-stretch bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.6)]" />

                        <div className="flex-1 flex items-center justify-between px-4 py-4">
                          <div className="flex items-center gap-5">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-orange-400 uppercase tracking-[0.2em] text-sm font-bold">
                                  Client #{room.clientId.slice(0, 8)}
                                </span>
                                <span className="text-orange-500/80 text-[10px] uppercase tracking-[0.1em] border border-orange-500/30 px-2 rounded-sm bg-orange-500/10">
                                  Support Req
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px]">
                                <span className="text-orange-700 uppercase tracking-[0.2em]">
                                  {room.numParticipants} participant{room.numParticipants !== 1 ? 's' : ''}
                                </span>
                                <span className="text-orange-900">|</span>
                                <span className="text-orange-600 font-bold uppercase tracking-[0.2em]">
                                  Waiting: {elapsed}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => router.push(`/admin/call/support-${room.clientId}`)}
                            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-black uppercase tracking-[0.2em] text-[10px] font-bold shadow-[0_0_15px_rgba(234,88,12,0.4)] hover:shadow-[0_0_20px_rgba(234,88,12,0.6)] transition-all duration-200"
                          >
                            Answer Call
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 2 — Unit Rooms */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                <h2 className="text-emerald-500 text-sm uppercase tracking-[0.2em] font-bold">
                  Unit Dashboard
                </h2>
              </div>
              {rooms.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 space-y-6">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border border-emerald-900/20" />
                      <div className="absolute inset-2 rounded-full border border-emerald-900/30" />
                      <div className="absolute inset-4 rounded-full border border-emerald-900/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-900/40" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-emerald-700 uppercase tracking-[0.3em] text-sm">
                        No Units Online
                      </p>
                      <p className="text-emerald-900 text-xs tracking-[0.2em]">
                        Waiting for units to connect...
                      </p>
                    </div>
                  </div>
              ) : (
                  /* Room list */
                  <div className="space-y-2">
            {rooms.map((room) => {
              const elapsed = formatElapsed(room.creationTime, tick);
              return (
                <div
                  key={room.name}
                  className="group flex items-center border border-emerald-900/20 bg-emerald-950/5 hover:bg-emerald-950/15 hover:border-emerald-900/40 transition-all duration-200"
                >
                  {/* Left accent bar */}
                  <div className="w-1 self-stretch bg-emerald-900/30 group-hover:bg-emerald-500 transition-colors duration-200" />

                  {/* Room info */}
                  <div className="flex-1 flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-5">
                      {/* Pulse indicator */}
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-40" />
                      </div>

                      {/* Unit details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-300 uppercase tracking-[0.3em] text-sm font-bold">
                            {room.unitId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-emerald-800 uppercase tracking-[0.2em]">
                            Room: {room.name}
                          </span>
                          <span className="text-emerald-900">|</span>
                          <span className="text-emerald-700 uppercase tracking-[0.2em]">
                            {room.numParticipants} participant{room.numParticipants !== 1 ? 's' : ''}
                          </span>
                          <span className="text-emerald-900">|</span>
                          <span className="text-emerald-800 uppercase tracking-[0.2em]">
                            {elapsed}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enter call button */}
                    <button
                      onClick={() => router.push(`/admin/call/${room.unitId}`)}
                      className="px-5 py-2 border border-emerald-700/40 text-emerald-400 uppercase tracking-[0.3em] text-[10px] hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all duration-200"
                    >
                      Enter Call
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </section>
        </div>
        )}
      </main>
    </div>
  );
}

/* ─── Helpers ─── */
function formatElapsed(creationTimeSec: number, _tick: number): string {
  if (!creationTimeSec) return '00:00:00';
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, nowSec - creationTimeSec);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
