/**
 * VideoCall Component
 * Complete video call entry point with:
 * - Pre-call UI (room name input, connect button)
 * - LiveKit room with proper options (adaptive stream, dynacast, h720)
 * - In-call chat panel alongside video grid
 * - Connection state management with all room events
 * - Token refresh on expiry
 * - Media permission handling
 * - Mobile browser support
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Video,
  Phone,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  VideoOff,
  RefreshCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LiveKitRoom } from '@livekit/components-react';
import { VideoPresets, type RoomOptions } from 'livekit-client';
import '@livekit/components-styles';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import VideoCallRoom from '@/components/video-call/VideoCallRoom';
import ConnectionOverlay from '@/components/video-call/ConnectionOverlay';
import { useVideoRoom } from '@/hooks/useVideoRoom';
import type { ConnectionState, PermissionError } from '@/types/video-call';

export interface VideoCallProps {
  prefilledRoom?: string;
  onBack?: () => void;
  onDisconnected?: () => void;
  initialVideoDisabled?: boolean;
}

/** LiveKit room options with required performance settings */
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

export default function VideoCall({
  prefilledRoom,
  onBack,
  onDisconnected,
  initialVideoDisabled = false,
}: VideoCallProps) {
  const [roomInput, setRoomInput] = useState(prefilledRoom || '');
  const [inCall, setInCall] = useState(false);
  const [permissionError, setPermissionError] = useState<PermissionError | null>(null);
  const [localConnectionState, setLocalConnectionState] = useState<ConnectionState>('idle');
  const hasCleanedUp = useRef(false);

  const {
    token,
    identity,
    roomName,
    connectionState,
    error,
    connectToRoom,
    refreshToken,
    disconnect,
    isConnecting,
  } = useVideoRoom({
    onDisconnected: () => {
      setInCall(false);
      toast('Дуудлага дууслаа', { icon: '📵' });
      onDisconnected?.();
    },
    onError: (errMsg) => {
      toast.error(errMsg);
    },
  });

  // Check media permissions before joining
  const checkMediaPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !initialVideoDisabled,
        audio: true,
      });
      // Stop tracks immediately — we just needed to check permissions
      stream.getTracks().forEach((track) => track.stop());
      setPermissionError(null);
      return true;
    } catch (err: unknown) {
      const error = err as DOMException;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError({
          type: initialVideoDisabled ? 'microphone' : 'both',
          message: 'Media permission denied',
        });
        return false;
      }
      // For other errors (no device found, etc.), try to continue
      console.warn('Media check warning:', error.message);
      return true;
    }
  }, [initialVideoDisabled]);

  const handleConnect = useCallback(async () => {
    const roomValue = roomInput.trim();
    if (!roomValue) {
      toast.error('Өрөөний нэр оруулна уу');
      return;
    }

    setPermissionError(null);
    setLocalConnectionState('connecting');

    // Check permissions first
    const hasPermission = await checkMediaPermissions();
    if (!hasPermission) {
      setLocalConnectionState('idle');
      return;
    }

    await connectToRoom(roomValue);
    setInCall(true);
  }, [roomInput, connectToRoom, checkMediaPermissions]);

  const handleLeave = useCallback(() => {
    if (hasCleanedUp.current) return;
    hasCleanedUp.current = true;
    disconnect();
    setInCall(false);
    setLocalConnectionState('idle');
    setPermissionError(null);
    // Reset cleanup flag after a tick
    setTimeout(() => {
      hasCleanedUp.current = false;
    }, 100);
  }, [disconnect]);

  const handleRetryPermission = useCallback(async () => {
    setPermissionError(null);
    const hasPermission = await checkMediaPermissions();
    if (hasPermission) {
      await connectToRoom(roomInput.trim());
      setInCall(true);
    }
  }, [checkMediaPermissions, connectToRoom, roomInput]);

  const handleDisconnected = useCallback(() => {
    handleLeave();
    onDisconnected?.();
  }, [handleLeave, onDisconnected]);

  // Handle keyboard Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isConnecting) {
        handleConnect();
      }
    },
    [handleConnect, isConnecting]
  );

  // In-call view — MUST portal on the same render that sets inCall=true. If we waited for
  // useEffect to set document.body, the first paint would render inside ChatWidget (rounded
  // box + overflow:hidden + transform) and all bottom controls would be clipped on mobile.
  if (inCall && token && LIVEKIT_URL) {
    const callUi = (
      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 z-[10000] bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
              <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Видео дуудлагад алдаа гарлаа</h2>
              <p className="text-slate-400 text-sm">
                Системийн алдаа гарлаа. Хуудсыг дахин ачаалж үзнэ үү.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Дахин ачаалах
              </button>
            </div>
          </div>
        }
      >
        <div className="fixed inset-0 z-[10000] flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] min-h-0 min-w-0 flex-col overflow-hidden bg-black overscroll-none">
          <LiveKitRoom
            video={!initialVideoDisabled}
            audio={true}
            token={token}
            serverUrl={LIVEKIT_URL}
            data-lk-theme="default"
            onDisconnected={handleDisconnected}
            options={ROOM_OPTIONS}
            className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
            style={{ minHeight: 0 }}
          >
            <VideoCallRoom roomName={roomName} identity={identity} />
          </LiveKitRoom>
        </div>
      </ErrorBoundary>
    );
    if (typeof document !== 'undefined') {
      return createPortal(callUi, document.body);
    }
    return null;
  }

  // Pre-call UI
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Буцах</span>
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {initialVideoDisabled ? (
              <Phone className="w-8 h-8 text-orange-500" />
            ) : (
              <Video className="w-8 h-8 text-orange-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {initialVideoDisabled ? 'Дуут дуудлага' : 'Видео дуудлага'}
          </h1>
          <p className="text-slate-600">
            Өрөөний нэр оруулж дуудлага эхлүүлнэ үү
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          {/* Permission error */}
          {permissionError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <VideoOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Зөвшөөрөл шаардлагатай
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {permissionError.type === 'camera' &&
                      'Камерын зөвшөөрлийг браузерийн тохиргооноос нээнэ үү.'}
                    {permissionError.type === 'microphone' &&
                      'Микрофоны зөвшөөрлийг браузерийн тохиргооноос нээнэ үү.'}
                    {permissionError.type === 'both' &&
                      'Камер болон микрофоны зөвшөөрлийг браузерийн тохиргооноос нээнэ үү.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connection error */}
          {error && !permissionError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="room-input-vc"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Өрөөний нэр
            </label>
            <input
              id="room-input-vc"
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="my-room-123"
              disabled={isConnecting}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-base disabled:opacity-50"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Нөгөө хүнтэйгээ адил нэр ашиглана уу
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting || !roomInput.trim()}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Холбогдож байна...</span>
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                <span>Дуудлагад орох</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
