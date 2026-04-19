'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/context/AuthContext';
import { getAblyClient } from '@/lib/ably';
import { getAblyEnabled } from '@/lib/ablyConfig';

/**
 * Lightweight hook that returns only the unread count.
 * Use this in the navbar badge where you don't need the full notification list.
 */
export function useNotificationBadge(): { count: number; hasNew: boolean } {
  const { user, isSignedIn } = useUser();
  const [count, setCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getAblyClient>['channels']['get']> | null>(null);
  const hasNewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial count
  const fetchCount = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {}
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setCount(0);
      return;
    }
    fetchCount();
  }, [isSignedIn, user?.id, fetchCount]);

  // Subscribe to real-time updates (skipped if ABLY_KEY unset)
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    let mounted = true;

    getAblyEnabled().then((ok) => {
      if (!ok || !mounted) return;
      try {
        const ably = getAblyClient();
        const channel = ably.channels.get(`notifications:${user.id}`);
        channelRef.current = channel;

        channel.subscribe('new_notification', () => {
          if (!mounted) return;
          setCount((prev) => prev + 1);
          setHasNew(true);

          if (hasNewTimerRef.current) clearTimeout(hasNewTimerRef.current);
          hasNewTimerRef.current = setTimeout(() => {
            if (mounted) setHasNew(false);
          }, 3000);
        });

        channel.subscribe('unread_count', (msg) => {
          if (!mounted) return;
          setCount((msg.data as { count: number }).count);
        });
      } catch {
        // ignore
      }
    });

    return () => {
      mounted = false;
      if (hasNewTimerRef.current) clearTimeout(hasNewTimerRef.current);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [isSignedIn, user?.id]);

  return { count, hasNew };
}
