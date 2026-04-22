/**
 * Email Queue & Rate Limiting for Resend Free Tier (100/day)
 *
 * Collections used:
 *   - emailLogs:  every email sent (for daily count tracking)
 *   - emailQueue: scheduled emails waiting to be processed
 *
 * Strategy: hard cap at 90/day, leaving 10 buffer for transactional.
 * Welcome emails are high-priority (send immediately).
 * Bulk emails (flash sales) get queued if limit is near.
 */

import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

/* ─── Constants ─── */
export const DAILY_SEND_LIMIT = 90; // Leave 10 buffer below Resend's 100

/* ─── Types ─── */
export interface EmailLog {
  _id?: ObjectId;
  userId: string;
  type: string; // 'welcome' | 'flash_sale' | 'abandoned_browse' | etc.
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  messageId?: string;
  error?: string;
  sentAt: Date;
}

export interface EmailQueueItem {
  _id?: ObjectId;
  userId: string;
  type: string;
  payload: string; // JSON string with template data
  scheduledFor: Date;
  processed: boolean;
  createdAt: Date;
}

/* ─── Daily Count ─── */
export async function getDailySentCount(): Promise<number> {
  const logs = await getCollection<EmailLog>('emailLogs');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return logs.countDocuments({
    status: 'sent',
    sentAt: { $gte: twentyFourHoursAgo },
  });
}

export async function canSendMore(): Promise<{ allowed: boolean; sent: number; remaining: number }> {
  const sent = await getDailySentCount();
  const remaining = Math.max(0, DAILY_SEND_LIMIT - sent);
  return { allowed: remaining > 0, sent, remaining };
}

/* ─── Log an email send ─── */
export async function logEmailSend(entry: Omit<EmailLog, '_id'>): Promise<void> {
  const logs = await getCollection<EmailLog>('emailLogs');
  await logs.insertOne(entry as EmailLog);
}

/* ─── Get recent logs for a user ─── */
export async function getUserEmailLogs(userId: string, limit = 5): Promise<EmailLog[]> {
  const logs = await getCollection<EmailLog>('emailLogs');
  return logs
    .find({ userId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .toArray();
}

/* ─── Queue an email for later ─── */
export async function scheduleEmail(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
  scheduledFor: Date,
): Promise<void> {
  const queue = await getCollection<EmailQueueItem>('emailQueue');
  await queue.insertOne({
    userId,
    type,
    payload: JSON.stringify(payload),
    scheduledFor,
    processed: false,
    createdAt: new Date(),
  } as EmailQueueItem);
}

/* ─── Get batch of due queue items ─── */
export async function getBatchToSend(limit = 90): Promise<EmailQueueItem[]> {
  const queue = await getCollection<EmailQueueItem>('emailQueue');
  return queue
    .find({
      scheduledFor: { $lte: new Date() },
      processed: false,
    })
    .sort({ scheduledFor: 1 })
    .limit(limit)
    .toArray();
}

/* ─── Mark queue items as processed ─── */
export async function markProcessed(ids: ObjectId[]): Promise<void> {
  if (ids.length === 0) return;
  const queue = await getCollection<EmailQueueItem>('emailQueue');
  await queue.updateMany(
    { _id: { $in: ids } },
    { $set: { processed: true } },
  );
}

/* ─── Stats for admin dashboard ─── */
export async function getEmailStats() {
  const logs = await getCollection<EmailLog>('emailLogs');
  const queue = await getCollection<EmailQueueItem>('emailQueue');

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [sentToday, totalSent, totalFailed, pendingQueue] = await Promise.all([
    logs.countDocuments({ status: 'sent', sentAt: { $gte: twentyFourHoursAgo } }),
    logs.countDocuments({ status: 'sent' }),
    logs.countDocuments({ status: 'failed' }),
    queue.countDocuments({ processed: false }),
  ]);

  return { sentToday, totalSent, totalFailed, pendingQueue };
}

/* ─── Get queued count ─── */
export async function getQueuedCount(): Promise<number> {
  const queue = await getCollection<EmailQueueItem>('emailQueue');
  return queue.countDocuments({ processed: false });
}
