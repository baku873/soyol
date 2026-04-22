'use client';

import { use, useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  TrackToggle,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';

/* ─── Types ─── */
interface UnitPageProps {
  params: Promise<{ unitId: string }>;
}

/* ─── Main Page ─── */
export default function UnitPage({ params }: UnitPageProps) {
  const { unitId } = use(params);
  const roomName = `room-${unitId}`;
  const identity = `unit-${unitId}`;

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permError, setPermError] = useState<string | null>(null);

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
  }, [roomName, identity]);

  /* Check media permissions proactively */
  useEffect(() => {
    async function checkPermissions() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            setPermError('Camera & microphone access was denied. Please allow permissions in your browser settings and reload.');
          } else if (err.name === 'NotFoundError') {
            setPermError('No camera or microphone found. Please connect a device and reload.');
          }
        }
      }
    }
    checkPermissions();
  }, []);

  /* ─── Permission Error ─── */
  if (permError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#080c0a' }}>
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-red-500/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-red-400 uppercase tracking-[0.3em] text-sm font-mono">Permission Denied</h2>
          <p className="text-red-300/70 text-sm font-mono">{permError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 border border-red-500/50 text-red-400 uppercase tracking-[0.3em] text-xs font-mono hover:bg-red-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ─── Loading / Error States ─── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c0a' }}>
        <div className="text-center space-y-3">
          <p className="text-red-400 uppercase tracking-[0.3em] text-sm font-mono">Connection Error</p>
          <p className="text-red-300/60 text-xs font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!token || !livekitUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c0a' }}>
        <div className="text-center space-y-4">
          <RadarSpinner />
          <p className="text-emerald-700 uppercase tracking-[0.3em] text-xs font-mono animate-pulse">
            Initializing Feed...
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      video={true}
      audio={true}
      connect={true}
      style={{ height: '100vh', background: '#080c0a' }}
      onError={(err) => {
        console.error('LiveKit error:', err);
        setError(err.message);
      }}
    >
      <UnitRoomUI unitId={unitId} />
    </LiveKitRoom>
  );
}

/* ─────────────────────────────────────────── */
/* Inner Room UI                               */
/* ─────────────────────────────────────────── */
function UnitRoomUI({ unitId }: { unitId: string }) {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const adminPresent = remoteParticipants.length > 0;

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (t) => t.participant.sid === localParticipant.sid && t.source === Track.Source.Camera && t.publication?.track
  );

  const remoteCameraTrack = tracks.find(
    (t) => t.participant.sid !== localParticipant.sid && t.source === Track.Source.Camera && t.publication?.track
  );

  const remoteMicTrack = tracks.find(
    (t) => t.participant.sid !== localParticipant.sid && t.source === Track.Source.Microphone && t.publication?.track
  );

  /* ─── WAITING STATE ─── */
  if (!adminPresent) {
    return (
      <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: '#080c0a' }}>
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Local video preview */}
        <div className="relative w-64 h-48 md:w-80 md:h-60 rounded border border-emerald-900/30 overflow-hidden mb-8">
          {/* Scanline overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none" style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.03) 2px, rgba(16,185,129,0.03) 4px)',
          }} />
          {localCameraTrack?.publication?.track ? (
            <VideoTrack
              trackRef={localCameraTrack}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-950/20">
              <svg className="w-12 h-12 text-emerald-900/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Unit ID badge */}
          <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-black/60 border border-emerald-900/40">
            <span className="text-[10px] text-emerald-400 uppercase tracking-[0.3em] font-mono">
              {unitId}
            </span>
          </div>
        </div>

        {/* Radar animation */}
        <RadarSpinner />

        {/* Status text */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500 uppercase tracking-[0.3em] text-xs font-mono">Online</span>
          </div>
          <p className="text-emerald-800 uppercase tracking-[0.3em] text-[11px] font-mono animate-pulse">
            Awaiting Admin...
          </p>
        </div>

        {/* Controls */}
        <div className="mt-8 flex gap-3">
          <TrackToggle
            source={Track.Source.Camera}
            className="px-4 py-2 border border-emerald-900/40 text-emerald-500 uppercase tracking-[0.3em] text-[10px] font-mono hover:bg-emerald-500/10 transition-colors bg-transparent"
          />
          <TrackToggle
            source={Track.Source.Microphone}
            className="px-4 py-2 border border-emerald-900/40 text-emerald-500 uppercase tracking-[0.3em] text-[10px] font-mono hover:bg-emerald-500/10 transition-colors bg-transparent"
          />
        </div>
      </div>
    );
  }

  /* ─── CALL STATE ─── */
  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: '#080c0a' }}>
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Header bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2 border-b border-emerald-900/30">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 uppercase tracking-[0.3em] text-[11px] font-mono">Live</span>
          <span className="text-emerald-800 text-[11px] font-mono">|</span>
          <span className="text-emerald-300 uppercase tracking-[0.3em] text-[11px] font-mono">{unitId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-800 text-[10px] font-mono uppercase tracking-[0.3em]">
            {remoteParticipants.length + 1} connected
          </span>
        </div>
      </div>

      {/* Remote video (large) */}
      <div className="flex-1 relative z-10">
        {/* Scanline overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.03) 2px, rgba(16,185,129,0.03) 4px)',
        }} />

        {remoteCameraTrack?.publication?.track ? (
          <VideoTrack
            trackRef={remoteCameraTrack}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <svg className="w-16 h-16 mx-auto text-emerald-900/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-emerald-900/60 text-[10px] uppercase tracking-[0.3em] font-mono">
                Admin Camera Off
              </p>
            </div>
          </div>
        )}

        {/* Remote audio */}
        {remoteMicTrack?.publication?.track && (
          <AudioTrack trackRef={remoteMicTrack} />
        )}

        {/* Local video PiP */}
        <div className="absolute bottom-4 right-4 z-20 w-36 h-28 md:w-48 md:h-36 border border-emerald-900/50 overflow-hidden shadow-lg shadow-black/50">
          {localCameraTrack?.publication?.track ? (
            <VideoTrack
              trackRef={localCameraTrack}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#0a0f0c' }}>
              <svg className="w-8 h-8 text-emerald-900/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {/* PiP label */}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70">
            <span className="text-[8px] text-emerald-500 uppercase tracking-[0.2em] font-mono">You</span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 flex items-center justify-center gap-4 px-4 py-3 border-t border-emerald-900/30">
        <TrackToggle
          source={Track.Source.Camera}
          className="px-5 py-2 border border-emerald-900/40 text-emerald-400 uppercase tracking-[0.3em] text-[10px] font-mono hover:bg-emerald-500/10 transition-colors bg-transparent"
        />
        <TrackToggle
          source={Track.Source.Microphone}
          className="px-5 py-2 border border-emerald-900/40 text-emerald-400 uppercase tracking-[0.3em] text-[10px] font-mono hover:bg-emerald-500/10 transition-colors bg-transparent"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Radar / Spinner                             */
/* ─────────────────────────────────────────── */
function RadarSpinner() {
  return (
    <div className="relative w-24 h-24">
      {/* Concentric circles */}
      <div className="absolute inset-0 rounded-full border border-emerald-900/20" />
      <div className="absolute inset-3 rounded-full border border-emerald-900/30" />
      <div className="absolute inset-6 rounded-full border border-emerald-900/40" />
      {/* Rotating sweep */}
      <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/60 animate-spin" style={{ animationDuration: '3s' }} />
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  );
}
