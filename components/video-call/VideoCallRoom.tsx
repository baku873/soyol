/**
 * VideoCallRoom Component
 * The main in-call component that renders inside a LiveKitRoom context.
 * Contains video conference UI, in-call chat panel, room event handling,
 * and connection state overlays.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  VideoConference,
  RoomAudioRenderer,
  DisconnectButton,
  useParticipants,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { MessageCircle, Ban, Users, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';
import RoomEventHandler from './RoomEventHandler';
import ChatPanel from './ChatPanel';
import ConnectionOverlay from './ConnectionOverlay';
import { useRoomChat } from '@/hooks/useRoomChat';
import type { ConnectionState } from '@/types/video-call';

interface VideoCallRoomProps {
  roomName: string;
  identity: string;
}

export default function VideoCallRoom({ roomName, identity }: VideoCallRoomProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [participantCount, setParticipantCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // In-call chat via Ably
  const {
    messages,
    sendMessage,
    unreadCount,
    resetUnread,
    isLoading: chatLoading,
    error: chatError,
  } = useRoomChat({
    roomId: roomName,
    senderId: identity,
    senderName: identity,
    enabled: connectionState === 'connected',
  });

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) resetUnread();
      return next;
    });
  }, [resetUnread]);

  const handleChatClose = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
  }, []);

  const handleParticipantCountChange = useCallback((count: number) => {
    setParticipantCount(count);
  }, []);

  const handleError = useCallback((errMsg: string) => {
    setError(errMsg);
  }, []);

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-row">
      {/* Room Event Handler — headless, runs inside LiveKitRoom */}
      <RoomEventHandler
        onConnectionStateChange={handleConnectionStateChange}
        onParticipantCountChange={handleParticipantCountChange}
        onError={handleError}
        identity={identity}
      />

      {/* Audio Renderer */}
      <RoomAudioRenderer />

      {/* Connection Overlays */}
      <ConnectionOverlay
        connectionState={connectionState}
        error={error}
        permissionError={null}
      />

      {/* Main Content Area — min-w-0 min-h-0 so LiveKit grid gets a real height and doesn’t squash */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar with room info + chat toggle */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 pointer-events-none">
          {/* Left: Room info */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 flex items-center gap-3">
              <span className="text-white text-sm font-semibold">
                Өрөө: {roomName}
              </span>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-slate-300 text-xs font-medium">
                  {participantCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Chat toggle + Ban controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleChat}
              className="relative bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/20 hover:bg-black/80 transition-colors"
              aria-label="Toggle chat"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* LiveKit VideoConference — prefab control bar can be clipped in nested/mobile layouts */}
        <div className="relative flex min-h-0 flex-1 flex-col [&_.lk-video-conference]:flex [&_.lk-video-conference]:min-h-0 [&_.lk-video-conference]:h-full [&_.lk-video-conference]:flex-1">
          <VideoConference />
          <div
            className={`pointer-events-none absolute left-0 right-0 z-[80] flex justify-center px-3 pt-2 transition-[bottom] duration-200 ease-out ${
              isChatOpen
                ? 'bottom-[calc(58vh+0.75rem)] pb-0 md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]'
                : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            }`}
          >
            <DisconnectButton className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40 hover:bg-red-700 active:scale-[0.98] transition-transform">
              <PhoneOff className="h-5 w-5 shrink-0" aria-hidden />
              Дуудлага таслах
            </DisconnectButton>
          </div>
        </div>

        {/* Ban Controls */}
        <BanControls currentRoom={roomName} currentIdentity={identity} />
      </div>

      {/* In-Call Chat Panel */}
      <ChatPanel
        messages={messages}
        onSendMessage={sendMessage}
        isOpen={isChatOpen}
        onClose={handleChatClose}
        unreadCount={unreadCount}
        isLoading={chatLoading}
        currentUserId={identity}
        error={chatError}
      />
    </div>
  );
}

/**
 * BanControls — allows kicking remote participants.
 * Rendered inside LiveKitRoom context.
 */
function BanControls({
  currentRoom,
  currentIdentity,
}: {
  currentRoom: string;
  currentIdentity: string;
}) {
  const participants = useParticipants();
  const others = participants.filter((p) => p.identity !== currentIdentity);

  const handleKick = async (participantIdentity: string) => {
    try {
      const res = await fetch('/api/livekit/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: currentRoom,
          identity: participantIdentity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Хэрэглэгчийг гаргалаа');
      } else {
        toast.error('Алдаа гарлаа: ' + (data.error || 'Unknown'));
      }
    } catch {
      toast.error('Гаргах хүсэлт амжилтгүй боллоо');
    }
  };

  if (others.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-4 z-30">
      <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/20">
        <h3 className="text-xs text-white/70 mb-2 uppercase font-semibold tracking-wider">
          Оролцогчид
        </h3>
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
          {others.map((p) => (
            <div
              key={p.identity}
              className="flex items-center justify-between gap-4 text-white text-sm"
            >
              <span className="truncate max-w-[120px]">{p.identity}</span>
              <button
                onClick={() => handleKick(p.identity)}
                title="Гаргах (Ban)"
                className="p-1.5 bg-red-500 hover:bg-red-600 rounded-md transition-colors shrink-0"
              >
                <Ban className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
