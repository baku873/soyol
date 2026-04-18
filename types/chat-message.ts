/**
 * Chat Message Types
 * Used for in-call chat and room-based messaging.
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  timestamp: number;
  roomId: string;
  status: MessageStatus;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SendMessagePayload {
  body: string;
  roomId: string;
  senderId: string;
  senderName: string;
}

export interface AblyMessageData {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  timestamp: number;
  roomId: string;
}
