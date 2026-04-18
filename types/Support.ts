import { ObjectId } from 'mongodb';

export type ConversationStatus = 'open' | 'active' | 'resolved' | 'closed';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Conversation {
  _id?: ObjectId;
  userId: ObjectId;
  assignedAdminId: ObjectId | null;
  status: ConversationStatus;
  subject: string;
  priority: ConversationPriority;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Date;
  resolvedAt?: Date;
}

export type MessageSenderType = 'user' | 'admin';

export interface SupportAttachment {
  url: string;
  name: string;
  type: string;
}

export interface SupportMessage {
  _id?: ObjectId;
  conversationId: ObjectId;
  senderId: ObjectId;
  senderType: MessageSenderType;
  body: string;
  attachments?: SupportAttachment[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  isInternal?: boolean;
}
