/**
 * Server-side support message broadcast via Ably.
 *
 * Uses Ably REST API to broadcast new messages, conversation updates,
 * and typing indicators without requiring a persistent WebSocket
 * connection on the server.
 */

import Ably from 'ably';
import type { SupportMessage, Conversation } from '@/types/Support';

let ablyRest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest | null {
  if (ablyRest) return ablyRest;

  const key = process.env.ABLY_KEY;
  if (!key) {
    console.warn('[MessageBroadcast] ABLY_KEY not configured — skipping broadcast');
    return null;
  }

  ablyRest = new Ably.Rest(key);
  return ablyRest;
}

export interface BroadcastMessagePayload extends Omit<SupportMessage, '_id' | 'conversationId' | 'senderId'> {
  id: string;
  conversationId: string;
  senderId: string;
}

/**
 * Broadcast a new message to a specific conversation channel.
 */
export async function broadcastNewMessage(
  conversationId: string,
  message: BroadcastMessagePayload
): Promise<void> {
  try {
    const rest = getAblyRest();
    if (!rest) return;

    const channelName = `conversation:${conversationId}`;
    const channel = rest.channels.get(channelName);

    await channel.publish('new_message', message);
  } catch (error) {
    console.error('[MessageBroadcast] Failed to broadcast message:', error);
  }
}

/**
 * Broadcast a conversation update to the admin dashboard.
 */
export async function broadcastAdminConversationUpdate(
  conversation: Partial<Conversation> & { id: string }
): Promise<void> {
  try {
    const rest = getAblyRest();
    if (!rest) return;

    const channelName = 'admin:messages';
    const channel = rest.channels.get(channelName);

    await channel.publish('conversation_update', conversation);
  } catch (error) {
    console.error('[MessageBroadcast] Failed to broadcast admin update:', error);
  }
}

/**
 * Broadcast typing indicator to a conversation.
 * @param conversationId The ID of the conversation.
 * @param userId The ID of the user who is typing.
 * @param isTyping True if typing started, false if stopped.
 */
export async function broadcastTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const rest = getAblyRest();
    if (!rest) return;

    const channelName = `typing:${conversationId}`;
    const channel = rest.channels.get(channelName);

    await channel.publish('typing', { userId, isTyping });
  } catch (error) {
    console.error('[MessageBroadcast] Failed to broadcast typing:', error);
  }
}
