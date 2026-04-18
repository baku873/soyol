/**
 * RoomEventHandler Component
 * Listens to all required LiveKit RoomEvents and updates the parent
 * component's connection state accordingly.
 * Must be placed inside a <LiveKitRoom> context.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, ConnectionState } from 'livekit-client';
import toast from 'react-hot-toast';
import type { ConnectionState as AppConnectionState } from '@/types/video-call';

interface RoomEventHandlerProps {
  onConnectionStateChange: (state: AppConnectionState) => void;
  onParticipantCountChange: (count: number) => void;
  onError: (error: string) => void;
  identity: string;
}

export default function RoomEventHandler({
  onConnectionStateChange,
  onParticipantCountChange,
  onError,
  identity,
}: RoomEventHandlerProps) {
  const room = useRoomContext();

  const mapConnectionState = useCallback(
    (state: ConnectionState): AppConnectionState => {
      switch (state) {
        case ConnectionState.Connected:
          return 'connected';
        case ConnectionState.Connecting:
          return 'connecting';
        case ConnectionState.Reconnecting:
          return 'reconnecting';
        case ConnectionState.Disconnected:
          return 'disconnected';
        default:
          return 'idle';
      }
    },
    []
  );

  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      onConnectionStateChange('connected');
      toast.success('Дуудлагад нэгдлээ!', { id: 'room-connected' });
    };

    const handleDisconnected = () => {
      onConnectionStateChange('disconnected');
    };

    const handleReconnecting = () => {
      onConnectionStateChange('reconnecting');
      toast.loading('Дахин холбогдож байна...', { id: 'room-reconnecting' });
    };

    const handleReconnected = () => {
      onConnectionStateChange('connected');
      toast.success('Дахин холбогдлоо!', { id: 'room-reconnecting' });
    };

    const handleParticipantConnected = () => {
      const count = room.remoteParticipants.size + 1;
      onParticipantCountChange(count);
      toast.success('Шинэ оролцогч нэгдлээ', {
        duration: 2000,
        icon: '👤',
      });
    };

    const handleParticipantDisconnected = () => {
      const count = room.remoteParticipants.size + 1;
      onParticipantCountChange(count);
      toast('Оролцогч гарлаа', {
        duration: 2000,
        icon: '👋',
      });
    };

    const handleTrackSubscribed = () => {
      // Track subscribed — participant's media is now available
    };

    const handleTrackUnsubscribed = () => {
      // Track unsubscribed — participant's media removed
    };

    // Set initial state
    onConnectionStateChange(mapConnectionState(room.state));
    onParticipantCountChange(room.remoteParticipants.size + 1);

    // Register event listeners
    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room, identity, onConnectionStateChange, onParticipantCountChange, onError, mapConnectionState]);

  return null;
}
