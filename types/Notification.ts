import { ObjectId } from 'mongodb';

// ==========================================
// NOTIFICATION TYPE CONSTANTS
// ==========================================

export const NOTIFICATION_TYPES = [
  'product_added',
  'product_coming_soon',
  'product_on_sale',
  'new_product',
  'order_placed',
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  'admin_message_received',
  'admin_message_replied',
  'call_incoming',
  'call_missed',
  'call_transferred',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Notification types that users can configure preferences for */
export const CONFIGURABLE_NOTIFICATION_TYPES = [
  'product_added',
  'product_coming_soon',
  'product_on_sale',
  'new_product',
  'order_placed',
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
] as const;

export type ConfigurableNotificationType = (typeof CONFIGURABLE_NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const RECIPIENT_TYPES = ['user', 'admin'] as const;
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

export const QUEUE_STATUSES = ['pending', 'processing', 'sent', 'failed'] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

// ==========================================
// NOTIFICATION DOCUMENT
// ==========================================

export interface Notification {
  _id?: ObjectId;
  recipientId: ObjectId;
  recipientType: RecipientType;
  type: NotificationType;
  title: string;
  body: string;
  /** Flexible payload — varies per notification type */
  data?: Record<string, unknown>;
  isRead: boolean;
  isEmailSent: boolean;
  emailSentAt?: Date | null;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  createdAt: Date;
  readAt?: Date | null;
}

// ==========================================
// NOTIFICATION PREFERENCE DOCUMENT
// ==========================================

export interface ChannelPreference {
  inApp: boolean;
  email: boolean;
}

export type NotificationPreferences = Record<ConfigurableNotificationType, ChannelPreference>;

export interface NotificationPreference {
  _id?: ObjectId;
  userId: ObjectId;
  preferences: NotificationPreferences;
  updatedAt: Date;
}

// ==========================================
// NOTIFICATION QUEUE DOCUMENT
// ==========================================

export interface NotificationQueue {
  _id?: ObjectId;
  notificationId: ObjectId;
  channel: NotificationChannel;
  status: QueueStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date | null;
  error?: string | null;
  scheduledFor: Date;
  createdAt: Date;
}

// ==========================================
// SERVICE PAYLOADS
// ==========================================

export interface CreateNotificationPayload {
  recipientId: string;
  recipientType?: RecipientType;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

export interface NotificationListResult {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Default channel preferences — all enabled */
export function getDefaultPreferences(): NotificationPreferences {
  const defaults = {} as NotificationPreferences;
  for (const type of CONFIGURABLE_NOTIFICATION_TYPES) {
    defaults[type] = { inApp: true, email: true };
  }
  return defaults;
}
