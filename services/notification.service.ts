import { ObjectId, WithId, Document } from 'mongodb';

import { getCollection, getDb } from '@/lib/mongodb';
import {
  Notification,
  NotificationPreference,
  NotificationQueue,
  CreateNotificationPayload,
  NotificationListResult,
  getDefaultPreferences,
  NotificationPreferences,
  ConfigurableNotificationType,
  CONFIGURABLE_NOTIFICATION_TYPES,
} from '@/types/Notification';
import { broadcastNotification, broadcastUnreadCount } from '@/lib/notificationBroadcast';

// ==========================================
// COLLECTION HELPERS
// ==========================================

const NOTIFICATIONS = 'notifications';
const NOTIFICATION_PREFERENCES = 'notification_preferences';
const NOTIFICATION_QUEUE = 'notification_queue';

async function notificationsCol() {
  return getCollection<Notification>(NOTIFICATIONS);
}

async function preferencesCol() {
  return getCollection<NotificationPreference>(NOTIFICATION_PREFERENCES);
}

async function queueCol() {
  return getCollection<NotificationQueue>(NOTIFICATION_QUEUE);
}

// ==========================================
// CORE: CREATE NOTIFICATION
// ==========================================

/**
 * Creates a notification, respects user preferences, and enqueues
 * delivery jobs for each enabled channel.
 */
export async function createNotification(
  payload: CreateNotificationPayload,
): Promise<WithId<Document>> {
  const col = await notificationsCol();
  const recipientOid = new ObjectId(payload.recipientId);

  // Determine channels — honour user preferences if configurable type
  let channels = payload.channels ?? ['in_app'];

  const isConfigurable = (CONFIGURABLE_NOTIFICATION_TYPES as readonly string[]).includes(
    payload.type,
  );
  if (isConfigurable) {
    const prefs = await getUserPreferences(payload.recipientId);
    const pref = prefs.preferences[payload.type as ConfigurableNotificationType];
    if (pref) {
      channels = [];
      if (pref.inApp) channels.push('in_app');
      if (pref.email) channels.push('email');
    }
  }

  // If user has disabled all channels for this type, skip entirely
  if (channels.length === 0) {
    // Still store for audit, but mark as read
    const doc: Notification = {
      recipientId: recipientOid,
      recipientType: payload.recipientType ?? 'user',
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      isRead: true,
      isEmailSent: false,
      emailSentAt: null,
      channels: [],
      priority: payload.priority ?? 'normal',
      createdAt: new Date(),
      readAt: new Date(),
    };
    const result = await col.insertOne(doc as any);
    return { ...doc, _id: result.insertedId } as WithId<Document>;
  }

  const doc: Notification = {
    recipientId: recipientOid,
    recipientType: payload.recipientType ?? 'user',
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    isRead: false,
    isEmailSent: false,
    emailSentAt: null,
    channels,
    priority: payload.priority ?? 'normal',
    createdAt: new Date(),
    readAt: null,
  };

  const result = await col.insertOne(doc as any);
  const notificationId = result.insertedId;

  // Enqueue a delivery job per channel
  const qCol = await queueCol();
  const scheduledFor = payload.scheduledFor ?? new Date();
  const queueDocs = channels.map((channel) => ({
    notificationId,
    channel,
    status: 'pending' as const,
    attempts: 0,
    maxAttempts: 3,
    lastAttemptAt: null,
    error: null,
    scheduledFor,
    createdAt: new Date(),
  }));

  if (queueDocs.length > 0) {
    await qCol.insertMany(queueDocs as any[]);
  }

  console.log(
    `[NotificationService] Created notification ${notificationId} for ${payload.recipientId} (channels: ${channels.join(', ')})`,
  );

  // Broadcast real-time to user's browser (non-blocking)
  broadcastNotification(payload.recipientId, {
    _id: notificationId.toString(),
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    priority: payload.priority ?? 'normal',
    createdAt: doc.createdAt.toISOString(),
    isRead: false,
  }).catch((err) => console.error('[NotificationService] Broadcast failed:', err));

  return { ...doc, _id: notificationId } as WithId<Document>;
}

// ==========================================
// READ / UNREAD MANAGEMENT
// ==========================================

/**
 * Mark a single notification as read.
 * Returns true if the notification was found and updated.
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const col = await notificationsCol();
  const result = await col.updateOne(
    {
      _id: new ObjectId(notificationId),
      recipientId: new ObjectId(userId),
      isRead: false,
    },
    {
      $set: { isRead: true, readAt: new Date() },
    },
  );
  if (result.modifiedCount > 0) {
    // Broadcast updated count
    getUnreadCount(userId)
      .then((count) => broadcastUnreadCount(userId, count))
      .catch(() => {});
    return true;
  }
  return false;
}

/**
 * Mark all unread notifications for a user as read.
 * Returns the count of notifications updated.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const col = await notificationsCol();
  const result = await col.updateMany(
    {
      recipientId: new ObjectId(userId),
      isRead: false,
    },
    {
      $set: { isRead: true, readAt: new Date() },
    },
  );
  if (result.modifiedCount > 0) {
    broadcastUnreadCount(userId, 0).catch(() => {});
  }
  return result.modifiedCount;
}

/**
 * Get unread notification count for badge display.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const col = await notificationsCol();
  return col.countDocuments({
    recipientId: new ObjectId(userId),
    isRead: false,
  });
}

// ==========================================
// LISTING & DELETION
// ==========================================

/**
 * Get paginated notifications for a user. Sorted newest-first.
 */
export async function getUserNotifications(
  userId: string,
  page = 1,
  limit = 20,
): Promise<NotificationListResult> {
  const col = await notificationsCol();
  const filter = { recipientId: new ObjectId(userId) };
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return {
    notifications: notifications as unknown as Notification[],
    total,
    page,
    limit,
    hasMore: skip + notifications.length < total,
  };
}

/**
 * Delete a single notification (soft ownership check).
 * Returns true if deleted.
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const col = await notificationsCol();
  const result = await col.deleteOne({
    _id: new ObjectId(notificationId),
    recipientId: new ObjectId(userId),
  });
  return result.deletedCount > 0;
}

// ==========================================
// USER PREFERENCES
// ==========================================

/**
 * Get user notification preferences.
 * If none exist, creates a default document and returns it.
 */
export async function getUserPreferences(userId: string): Promise<NotificationPreference> {
  const col = await preferencesCol();
  const userOid = new ObjectId(userId);
  const existing = await col.findOne({ userId: userOid });

  if (existing) {
    return existing as unknown as NotificationPreference;
  }

  // Create default preferences
  const defaultDoc: NotificationPreference = {
    userId: userOid,
    preferences: getDefaultPreferences(),
    updatedAt: new Date(),
  };

  await col.insertOne(defaultDoc as any);
  return defaultDoc;
}

/**
 * Update user notification preferences (partial merge).
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<NotificationPreference> {
  const col = await preferencesCol();
  const userOid = new ObjectId(userId);

  // Ensure a doc exists first
  const current = await getUserPreferences(userId);

  // Merge incoming preferences with current
  const merged = { ...current.preferences };
  for (const [key, val] of Object.entries(preferences)) {
    if ((CONFIGURABLE_NOTIFICATION_TYPES as readonly string[]).includes(key) && val) {
      merged[key as ConfigurableNotificationType] = {
        inApp: val.inApp ?? merged[key as ConfigurableNotificationType].inApp,
        email: val.email ?? merged[key as ConfigurableNotificationType].email,
      };
    }
  }

  await col.updateOne(
    { userId: userOid },
    { $set: { preferences: merged, updatedAt: new Date() } },
  );

  return { ...current, preferences: merged, updatedAt: new Date() };
}

// ==========================================
// QUEUE PROCESSING
// ==========================================

/**
 * Process pending queue items.
 * Picks items whose scheduledFor <= now, marks them processing,
 * and dispatches to the appropriate channel handler.
 *
 * Returns the number of items processed.
 */
export async function processQueue(batchSize = 50): Promise<number> {
  const col = await queueCol();
  const notifCol = await notificationsCol();
  const now = new Date();

  // Find pending items ready to be sent
  const items = await col
    .find({
      status: 'pending',
      scheduledFor: { $lte: now },
    })
    .sort({ scheduledFor: 1 })
    .limit(batchSize)
    .toArray();

  if (items.length === 0) return 0;

  let processed = 0;

  for (const item of items) {
    try {
      // Mark as processing (optimistic lock)
      const lockResult = await col.updateOne(
        { _id: item._id, status: 'pending' },
        {
          $set: { status: 'processing', lastAttemptAt: now },
          $inc: { attempts: 1 },
        },
      );

      if (lockResult.modifiedCount === 0) {
        // Another worker grabbed it
        continue;
      }

      // Dispatch based on channel
      if (item.channel === 'email') {
        await processEmailDelivery(item as unknown as NotificationQueue, notifCol);
      }
      // in_app notifications are already stored — just mark sent
      await col.updateOne({ _id: item._id }, { $set: { status: 'sent' } });
      processed++;
    } catch (error: any) {
      const attempts = (item.attempts ?? 0) + 1;
      const maxAttempts = item.maxAttempts ?? 3;
      const newStatus = attempts >= maxAttempts ? 'failed' : 'pending';

      // Exponential backoff for retries
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 300000); // max 5 min
      const nextScheduled = new Date(now.getTime() + backoffMs);

      await col.updateOne(
        { _id: item._id },
        {
          $set: {
            status: newStatus,
            error: error.message || 'Unknown error',
            scheduledFor: newStatus === 'pending' ? nextScheduled : item.scheduledFor,
          },
        },
      );

      console.error(
        `[NotificationQueue] Failed to process ${item._id} (attempt ${attempts}/${maxAttempts}):`,
        error.message,
      );
    }
  }

  console.log(`[NotificationQueue] Processed ${processed}/${items.length} queue items`);
  return processed;
}

/**
 * Handle email delivery for a queue item.
 * Uses Resend via lib/email.ts patterns — extend as needed.
 */
async function processEmailDelivery(
  queueItem: NotificationQueue,
  notifCol: Awaited<ReturnType<typeof notificationsCol>>,
): Promise<void> {
  // Fetch the notification to get recipient + content
  const notification = await notifCol.findOne({ _id: queueItem.notificationId });
  if (!notification) {
    throw new Error(`Notification ${queueItem.notificationId} not found`);
  }

  // Fetch recipient email
  const usersCol = await getCollection('users');
  const user = await usersCol.findOne(
    { _id: notification.recipientId },
    { projection: { email: 1, name: 1 } },
  );

  if (!user?.email) {
    console.warn(
      `[NotificationQueue] No email for user ${notification.recipientId} — skipping email delivery`,
    );
    return;
  }

  // Send email via Resend
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      console.warn('[NotificationQueue] Skipping email send: RESEND_API_KEY not found');
      return;
    }

    await resend.emails.send({
      from: process.env.NOTIFICATION_FROM_EMAIL || 'Soyol <noreply@resend.dev>',
      to: user.email,
      subject: notification.title as string,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">${notification.title}</h2>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">${notification.body}</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Soyol Video Shop</p>
        </div>
      `,
    });

    // Mark email as sent on the notification
    await notifCol.updateOne(
      { _id: queueItem.notificationId },
      { $set: { isEmailSent: true, emailSentAt: new Date() } },
    );

    console.log(`[NotificationQueue] Email sent to ${user.email} for notification ${queueItem.notificationId}`);
  } catch (error) {
    throw error; // Let the queue processor handle retry
  }
}
