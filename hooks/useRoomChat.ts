/**
 * useRoomChat Hook
 * Manages in-call chat using Ably for real-time messaging
 * and MongoDB for message persistence.
 * 
 * Features:
 * - Real-time message delivery via Ably pub/sub
 * - Optimistic UI with status tracking
 * - Message persistence to MongoDB
 * - Unread badge support
 * - History loading on mount
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, AblyMessageData } from '@/types/chat-message';
import { getAblyClient } from '@/lib/ably';
import { getAblyEnabled } from '@/lib/ablyConfig';
import type Ably from 'ably';

interface UseRoomChatOptions {
  roomId: string;
  senderId: string;
  senderName: string;
  enabled: boolean;
}

interface UseRoomChatReturn {
  messages: ChatMessage[];
  sendMessage: (body: string) => void;
  unreadCount: number;
  resetUnread: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useRoomChat({
  roomId,
  senderId,
  senderName,
  enabled,
}: UseRoomChatOptions): UseRoomChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const isPanelOpenRef = useRef(false);
  const mountedRef = useRef(true);

  // Track panel open state for unread count
  const resetUnread = useCallback(() => {
    setUnreadCount(0);
    isPanelOpenRef.current = true;
  }, []);

  // Load message history from MongoDB
  const loadHistory = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/messages/room?roomId=${encodeURIComponent(roomId)}`);
      if (!res.ok) throw new Error('Failed to fetch message history');
      const data = (await res.json()) as Array<{
        id: string;
        senderId: string;
        senderName: string;
        body: string;
        timestamp: number;
        roomId: string;
      }>;

      if (mountedRef.current) {
        setMessages(
          data.map((msg) => ({
            ...msg,
            status: 'sent' as const,
          }))
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load history';
      if (mountedRef.current) {
        setError(errorMsg);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [roomId]);

  // Initialize Ably channel and subscribe (skipped if ABLY_KEY is not set)
  useEffect(() => {
    if (!enabled || !roomId) return;

    mountedRef.current = true;
    loadHistory();

    let channel: Ably.RealtimeChannel | null = null;
    let cancelled = false;

    const handleMessage = (message: Ably.Message) => {
      const data = message.data as AblyMessageData;

      if (data.senderId === senderId) return;

      if (!mountedRef.current) return;

      const chatMessage: ChatMessage = {
        id: data.id,
        senderId: data.senderId,
        senderName: data.senderName,
        body: data.body,
        timestamp: data.timestamp,
        roomId: data.roomId,
        status: 'sent',
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === chatMessage.id)) return prev;
        return [...prev, chatMessage];
      });

      if (!isPanelOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    getAblyEnabled().then((ok) => {
      if (!ok || cancelled || !mountedRef.current) return;
      const ably = getAblyClient();
      const channelName = `room-chat:${roomId}`;
      channel = ably.channels.get(channelName);
      channelRef.current = channel;
      channel.subscribe('message', handleMessage);
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (channel) {
        channel.unsubscribe('message', handleMessage);
        channel.detach();
      }
      channelRef.current = null;
    };
  }, [enabled, roomId, senderId, loadHistory]);

  // Send a message
  const sendMessage = useCallback(
    (body: string) => {
      if (!body.trim() || !channelRef.current) return;

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = Date.now();

      const chatMessage: ChatMessage = {
        id: messageId,
        senderId,
        senderName,
        body: body.trim(),
        timestamp,
        roomId,
        status: 'sending',
      };

      // Optimistic add
      setMessages((prev) => [...prev, chatMessage]);

      // Publish to Ably
      const ablyData: AblyMessageData = {
        id: messageId,
        senderId,
        senderName,
        body: body.trim(),
        timestamp,
        roomId,
      };

      channelRef.current
        .publish('message', ablyData)
        .then(() => {
          // Mark as sent
          if (mountedRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, status: 'sent' as const } : m
              )
            );
          }

          // Persist to MongoDB (fire and forget)
          fetch('/api/messages/room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ablyData),
          }).catch((err) => {
            console.error('Failed to persist message:', err);
          });
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Send failed';
          console.error('Ably publish error:', errorMsg);
          if (mountedRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, status: 'failed' as const } : m
              )
            );
          }
        });
    },
    [senderId, senderName, roomId]
  );

  return {
    messages,
    sendMessage,
    unreadCount,
    resetUnread,
    isLoading,
    error,
  };
}
