'use client';

import { useState, useCallback, useEffect } from 'react';
import { Video, Phone, ArrowLeft, Loader2, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useParticipants,
  useRoomContext
} from '@livekit/components-react';
import '@livekit/components-styles';

export interface VideoCallProps {
  prefilledRoom?: string;
  onBack?: () => void;
  onDisconnected?: () => void;
  initialVideoDisabled?: boolean;
}

export default function VideoCall({ 
  prefilledRoom, 
  onBack, 
  onDisconnected,
  initialVideoDisabled = false
}: VideoCallProps) {
  const [room, setRoom] = useState(prefilledRoom || '');
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [token, setToken] = useState('');
  const [identity, setIdentity] = useState('');

  const connectToRoom = async () => {
    const roomName = room.trim();
    if (!roomName) { toast.error('Өрөөний нэр оруулна уу'); return; }

    setConnecting(true);
    const userIdentity = `user_${Math.floor(Math.random() * 10000)}`;
    setIdentity(userIdentity);

    try {
      const res = await fetch(`/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(userIdentity)}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setToken(data.token);
      setInCall(true);
      toast.success('Дуудлагад нэгдлээ!');
    } catch (err) {
      toast.error('Холбогдож чадсангүй. Дахин оролдоно уу.');
    } finally {
      setConnecting(false);
    }
  };

  const onLeave = useCallback(async () => {
    setInCall(false);
    setToken('');
    toast('Дуудлага дууслаа', { icon: '📵' });
    onDisconnected?.();
  }, [onDisconnected]);

  // If we have token and we are in call
  if (inCall && token) {
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        <LiveKitRoom
          video={!initialVideoDisabled}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          onDisconnected={onLeave}
          style={{ height: '100dvh', width: '100vw' }}
        >
          {/* Default UI with custom top bar to show Room name / Kick capability */}
          <VideoConference />
          <RoomAudioRenderer />
          
          {/* Custom Overlay for Ban Feature */}
          <BanControls currentRoom={room} currentIdentity={identity} />
          
        </LiveKitRoom>
      </div>
    );
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
          <p className="text-slate-600">Өрөөний нэр оруулж дуудлага эхлүүлнэ үү</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
           <div>
            <label htmlFor="room-input" className="block text-sm font-medium text-slate-700 mb-2">
              Өрөөний нэр
            </label>
            <input
              id="room-input"
              type="text"
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="my-room-123"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-base"
            />
            <p className="mt-1.5 text-xs text-slate-400">Нөгөө хүнтэйгээ адил нэр ашиглана уу</p>
          </div>

          <button
            onClick={connectToRoom}
            disabled={connecting || !room.trim()}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {connecting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Холбогдож байна...</span></>
            ) : (
              <><Phone className="w-5 h-5" /><span>Дуудлагад орох</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent to handle kicking users
function BanControls({ currentRoom, currentIdentity }: { currentRoom: string, currentIdentity: string }) {
  const participants = useParticipants();
  
  // Exclude ourselves
  const others = participants.filter(p => p.identity !== currentIdentity);

  const handleKick = async (identity: string) => {
    try {
      const res = await fetch('/api/livekit/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: currentRoom, identity }),
      });
      const data = await res.json();
      if (data.success) {
         toast.success("Хэрэглэгчийг гаргалаа");
      } else {
         toast.error("Алдаа гарлаа: " + data.error);
      }
    } catch (e) {
      toast.error("Гаргах хүсэлт амжилтгүй боллоо");
    }
  };

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
      <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
        <span className="text-white text-sm font-semibold flex items-center gap-2">
            Өрөө: {currentRoom}
        </span>
      </div>
      
      {others.length > 0 && (
        <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/20 mt-2">
            <h3 className="text-xs text-white/70 mb-2 uppercase font-semibold">Оролцогчид</h3>
            <div className="flex flex-col gap-2">
                {others.map(p => (
                    <div key={p.identity} className="flex items-center justify-between gap-4 text-white text-sm">
                        <span>{p.identity}</span>
                        <button 
                            onClick={() => handleKick(p.identity)}
                            title="Гаргах (Ban)"
                            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                        >
                            <Ban className="w-4 h-4 text-white" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
