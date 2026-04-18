/**
 * Server-side notification broadcast via Ably.
 *
 * When a notification is created in MongoDB, call broadcastNotification()
 * to push it to the user's browser in real time via the Ably channel
 * "notifications:{userId}".
 *
 * Uses Ably REST API (server-side, no WebSocket needed).
 */

import Ably from 'ably';

let ablyRest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest | null {
  if (ablyRest) return ablyRest;

  const key = process.env.ABLY_KEY;
  if (!key) {
    console.warn('[NotificationBroadcast] ABLY_KEY not configured — skipping broadcast');
    return null;
  }

  ablyRest = new Ably.Rest(key);
  return ablyRest;
}

export interface BroadcastPayload {
  _id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * Broadcast a new notification to a specific user via Ably.
 * Called from the notification service after inserting into MongoDB.
 */
export async function broadcastNotification(
  userId: string,
  notification: BroadcastPayload,
): Promise<void> {
  try {
    const rest = getAblyRest();
    if (!rest) return;

    const channelName = `notifications:${userId}`;
    const channel = rest.channels.get(channelName);

    await channel.publish('new_notification', notification);

    console.log(
      `[NotificationBroadcast] Sent to ${channelName}: ${notification.type}`,
    );
  } catch (error) {
    // Non-blocking — don't let broadcast failures break notification creation
    console.error('[NotificationBroadcast] Failed to broadcast:', error);
  }
}

/**
 * Broadcast a badge count update to a specific user.
 */
export async function broadcastUnreadCount(
  userId: string,
  count: number,
): Promise<void> {
  try {
    const rest = getAblyRest();
    if (!rest) return;

    const channelName = `notifications:${userId}`;
    const channel = rest.channels.get(channelName);

    await channel.publish('unread_count', { count });
  } catch (error) {
    console.error('[NotificationBroadcast] Failed to broadcast count:', error);
  }
}
