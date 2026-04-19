'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/context/AuthContext';
import { getAblyClient } from '@/lib/ably';
import { getAblyEnabled } from '@/lib/ablyConfig';
import type { BroadcastPayload } from '@/lib/notificationBroadcast';

export interface ClientNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: string;
  createdAt: string;
  isRead: boolean;
}

interface UseNotificationsReturn {
  notifications: ClientNotification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  /** A notification that just arrived via real-time (for toast display) */
  latestRealtime: ClientNotification | null;
  clearLatestRealtime: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoKJjY2JhYJ/fn18e3p5eXl6e3x9f4GDh4uQlZqdoaSorK+ytba5u73AwcPExcbGxsbFxcTDwcC+vLm3tbKwraqnoZ2ZlZCMiIOAfXt4dXJwbm1sa2ppaGdnZ2dnaGlqa2xtb3FzdXh7foGEh4qNkJOWmZ2go6aprK+ytbi7vsHExsjKy83O0NHS09PU1NTU1NTT09LR0M/OzMvJyMbEwb+9uru5uLe2trW1tbW1tra3uLm6u73AwcTGyMrMz9HS1NbY2tzd3t/g4ODg4N/f3t3c29nY1tTS0M7MysjGxMLAvrq4trSysK6sqainpqWkpKSkpaanqaqsrrCytLa5u77BxMfKzc/S1dfa3N7g4ePk5ebn5+fn5+bm5eTj4uDf3dvZ19XTAAAAGBgYGBgYGBg=';

export function useNotifications(): UseNotificationsReturn {
  const { user, isSignedIn } = useUser();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [latestRealtime, setLatestRealtime] = useState<ClientNotification | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getAblyClient>['channels']['get']> | null>(null);

  const clearLatestRealtime = useCallback(() => setLatestRealtime(null), []);

  // ── Fetch notifications from API ──
  const fetchNotifications = useCallback(
    async (pageNum = 1, append = false) => {
      if (!isSignedIn) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications?page=${pageNum}&limit=20`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const items: ClientNotification[] = (data.notifications || []).map((n: any) => ({
          _id: n._id?.toString?.() || n._id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          priority: n.priority || 'normal',
          createdAt: n.createdAt,
          isRead: n.isRead,
        }));

        if (append) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const newItems = items.filter((i) => !existingIds.has(i._id));
            return [...prev, ...newItems];
          });
        } else {
          setNotifications(items);
        }
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    [isSignedIn],
  );

  // ── Fetch unread count ──
  const fetchUnreadCount = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count ?? 0);
    } catch {
      // Silently fail
    }
  }, [isSignedIn]);

  // ── Initial fetch ──
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    fetchNotifications(1);
    fetchUnreadCount();
  }, [isSignedIn, user?.id, fetchNotifications, fetchUnreadCount]);

  // ── Ably real-time (skip entirely if ABLY_KEY unset — see /api/ably/config) ──
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    let mounted = true;
    let ably: ReturnType<typeof getAblyClient> | null = null;
    let onConnectedHandler: (() => void) | undefined;

    getAblyEnabled().then((ok) => {
      if (!ok || !mounted) return;
      ably = getAblyClient();
      const channelName = `notifications:${user.id}`;

      const attach = () => {
        if (!mounted || !ably) return;
        try {
          const channel = ably.channels.get(channelName);
          channelRef.current = channel;

          channel.subscribe('new_notification', (msg) => {
            if (!mounted) return;
            const payload = msg.data as BroadcastPayload;
            const clientNotif: ClientNotification = {
              _id: payload._id,
              type: payload.type,
              title: payload.title,
              body: payload.body,
              data: payload.data,
              priority: payload.priority,
              createdAt: payload.createdAt,
              isRead: false,
            };

            setNotifications((prev) => {
              if (prev.some((n) => n._id === clientNotif._id)) return prev;
              return [clientNotif, ...prev];
            });

            setUnreadCount((prev) => prev + 1);
            setLatestRealtime(clientNotif);

            try {
              const audio = new Audio(NOTIFICATION_SOUND_URL);
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}

            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(payload.title, {
                body: payload.body,
                icon: '/favicon.ico',
              });
            }
          });

          channel.subscribe('unread_count', (msg) => {
            if (!mounted) return;
            const data = msg.data as { count: number };
            setUnreadCount(data.count);
          });
        } catch (err) {
          console.warn('[useNotifications] Ably channel attach failed:', err);
        }
      };

      onConnectedHandler = () => attach();

      if (ably.connection.state === 'connected') {
        attach();
      } else {
        ably.connection.on('connected', onConnectedHandler);
      }
    });

    return () => {
      mounted = false;
      if (ably && onConnectedHandler) {
        ably.connection.off('connected', onConnectedHandler);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [isSignedIn, user?.id]);

  // ── Request browser notification permission ──
  useEffect(() => {
    if (isSignedIn && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [isSignedIn]);

  // ── Actions ──
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`/api/notifications/mark-read/${id}`, { method: 'POST' });
      } catch {
        // Revert on failure
        fetchNotifications(1);
        fetchUnreadCount();
      }
    },
    [fetchNotifications, fetchUnreadCount],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    } catch {
      fetchNotifications(1);
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  const deleteNotification = useCallback(
    async (id: string) => {
      const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      } catch {
        fetchNotifications(1);
        fetchUnreadCount();
      }
    },
    [notifications, fetchNotifications, fetchUnreadCount],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNotifications(page + 1, true);
  }, [hasMore, loading, page, fetchNotifications]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchNotifications(1), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    latestRealtime,
    clearLatestRealtime,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refetch,
  };
}
