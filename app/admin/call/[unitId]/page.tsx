'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { RoomEvent } from 'livekit-client';

/* ─── Types ─── */
interface AdminCallPageProps {
  params: Promise<{ unitId: string }>;
}

/* ─── Main Page ─── */
export default function AdminCallPage({ params }: AdminCallPageProps) {
  const { unitId } = use(params);
  const router = useRouter();
  const roomName = `room-${unitId}`;
  const identity = `admin-${Date.now()}`;

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  /* Fetch token */
  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(identity)}`
        );
        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
        const data = await res.json();
        setToken(data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch token');
      }
    }
    fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  /* ─── Error ─── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: '#080c0a' }}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full border-2 border-red-500/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 uppercase tracking-[0.3em] text-xs">{error}</p>
          <button
            onClick={() => router.push('/admin/video')}
            className="px-5 py-2 border border-emerald-900/40 text-emerald-500 uppercase tracking-[0.3em] text-[10px] hover:bg-emerald-500/10 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ─── Loading ─── */
  if (!token || !livekitUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: '#080c0a' }}>
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border border-emerald-900/20" />
            <div className="absolute inset-2 rounded-full border border-emerald-900/30" />
            <div className="absolute inset-4 rounded-full border-t-2 border-emerald-500/60 animate-spin" style={{ animationDuration: '2s' }} />
          </div>
          <p className="text-emerald-700 uppercase tracking-[0.3em] text-[10px] animate-pulse">
            Connecting to {unitId}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-mono" style={{ background: '#080c0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-900/30 bg-black/40 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/video')}
            className="px-3 py-1.5 border border-emerald-900/40 text-emerald-600 uppercase tracking-[0.3em] text-[9px] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
          >
            ← Back
          </button>
          <span className="text-emerald-800 text-[10px]">|</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 uppercase tracking-[0.3em] text-[11px]">Live Call</span>
          <span className="text-emerald-800 text-[10px]">—</span>
          <span className="text-emerald-300 uppercase tracking-[0.3em] text-[11px] font-bold">{unitId}</span>
        </div>
      </div>

      {/* LiveKit room with VideoConference */}
      <div className="flex-1 min-h-0 lk-command-theme" data-lk-theme="default">
        <style jsx global>{`
          .lk-command-theme {
            --lk-bg: #080c0a;
            --lk-bg2: #0a0f0c;
            --lk-control-bg: #0c1210;
            --lk-control-hover-bg: #10201a;
            --lk-fg: #6ee7b7;
            --lk-border-color: rgba(16, 185, 129, 0.15);
            --lk-danger-color: #ef4444;
          }
          .lk-command-theme .lk-room-container {
            background: #080c0a !important;
          }
          .lk-command-theme .lk-control-bar {
            background: #0a0f0c !important;
            border-top: 1px solid rgba(16, 185, 129, 0.15) !important;
          }
          .lk-command-theme .lk-button {
            border-radius: 0 !important;
            font-family: var(--font-jetbrains, monospace) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
            font-size: 10px !important;
          }
          .lk-command-theme .lk-participant-tile {
            border-radius: 0 !important;
            border: 1px solid rgba(16, 185, 129, 0.15) !important;
          }
          .lk-command-theme .lk-participant-name {
            font-family: var(--font-jetbrains, monospace) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.15em !important;
            font-size: 10px !important;
            color: #6ee7b7 !important;
          }
          .lk-command-theme .lk-focus-layout {
            background: #080c0a !important;
          }
          .lk-command-theme .lk-grid-layout {
            background: #080c0a !important;
          }
        `}</style>
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          video={true}
          audio={true}
          connect={true}
          style={{ height: '100%' }}
          onError={(err) => {
            console.error('LiveKit error:', err);
            setError(err.message);
          }}
        >
          <VideoConference />
          <AdminRoomWatcher unitId={unitId} />
        </LiveKitRoom>
      </div>
    </div>
  );
}

/* ─── Watcher: auto-redirect when unit disconnects ─── */
function AdminRoomWatcher({ unitId }: { unitId: string }) {
  const room = useRoomContext();
  const router = useRouter();

  useEffect(() => {
    if (!room) return;

    const handleDisconnect = (participant: any) => {
      // Check if the disconnected participant is the unit
      const identity = participant?.identity || '';
      if (identity.startsWith('unit-')) {
        router.push('/admin/video');
      }
    };

    room.on(RoomEvent.ParticipantDisconnected, handleDisconnect);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnect);
    };
  }, [room, unitId, router]);

  return null;
}
