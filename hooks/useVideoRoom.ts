/**
 * useVideoRoom Hook
 * Manages LiveKit token fetching, refresh, and connection state.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConnectionState } from '@/types/video-call';

interface UseVideoRoomOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

interface UseVideoRoomReturn {
  token: string;
  identity: string;
  roomName: string;
  connectionState: ConnectionState;
  error: string | null;
  connectToRoom: (room: string, userName?: string) => Promise<void>;
  refreshToken: () => Promise<string | null>;
  disconnect: () => void;
  isConnecting: boolean;
}

export function useVideoRoom(options: UseVideoRoomOptions = {}): UseVideoRoomReturn {
  const [token, setToken] = useState('');
  const [identity, setIdentity] = useState('');
  const [roomName, setRoomName] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const fetchToken = useCallback(
    async (room: string, user: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: room,
            identity: user,
            displayName: user,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to fetch token' }));
          throw new Error(data.error || `Token request failed: ${res.status}`);
        }

        const data = await res.json();

        // Schedule token refresh at 80% of TTL
        if (data.expiresIn && mountedRef.current) {
          const refreshMs = data.expiresIn * 0.8 * 1000;
          refreshTimerRef.current = setTimeout(() => {
            refreshToken();
          }, refreshMs);
        }

        return data.token as string;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Token fetch failed';
        if (mountedRef.current) {
          setError(message);
          options.onError?.(message);
        }
        return null;
      }
    },
    [options]
  );

  const connectToRoom = useCallback(
    async (room: string, userName?: string) => {
      const trimmedRoom = room.trim();
      if (!trimmedRoom) {
        setError('Өрөөний нэр оруулна уу');
        return;
      }

      setConnectionState('connecting');
      setError(null);

      const userIdentity =
        userName?.trim() || `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const newToken = await fetchToken(trimmedRoom, userIdentity);

      if (newToken && mountedRef.current) {
        setToken(newToken);
        setIdentity(userIdentity);
        setRoomName(trimmedRoom);
        setConnectionState('connected');
      } else if (mountedRef.current) {
        setConnectionState('failed');
      }
    },
    [fetchToken]
  );

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!roomName || !identity) return null;

    const newToken = await fetchToken(roomName, identity);
    if (newToken && mountedRef.current) {
      setToken(newToken);
    }
    return newToken;
  }, [roomName, identity, fetchToken]);

  const disconnect = useCallback(() => {
    setToken('');
    setIdentity('');
    setRoomName('');
    setConnectionState('disconnected');
    setError(null);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    options.onDisconnected?.();
  }, [options]);

  return {
    token,
    identity,
    roomName,
    connectionState,
    error,
    connectToRoom,
    refreshToken,
    disconnect,
    isConnecting: connectionState === 'connecting',
  };
}
