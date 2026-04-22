/**
 * Rate-limited email sender for Resend Free Tier.
 *
 * Wraps the existing lib/resend.ts sendEmail with:
 *  - Daily send count checking (90/day cap)
 *  - Automatic queueing when limit is reached
 *  - EmailLog persistence for every attempt
 *  - Priority levels: 'high' sends immediately, 'bulk' respects queue
 */

import * as React from 'react';
import { sendEmail as baseSendEmail } from '@/lib/resend';
import {
  canSendMore,
  logEmailSend,
  scheduleEmail,
  DAILY_SEND_LIMIT,
} from '@/lib/email-queue';

export interface NotificationSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  queued?: boolean;
  scheduledFor?: Date;
}

/**
 * Send a notification email with rate-limit awareness.
 *
 * @param priority - 'high' = send now (welcome emails), 'bulk' = can be queued
 */
export async function sendNotificationEmail(opts: {
  to: string;
  userId: string;
  subject: string;
  type: string;
  react: React.ReactElement;
  priority?: 'high' | 'bulk';
  queuePayload?: Record<string, unknown>;
}): Promise<NotificationSendResult> {
  const { to, userId, subject, type, react, priority = 'bulk', queuePayload } = opts;

  const { allowed, sent, remaining } = await canSendMore();

  // If limit reached and this is a bulk email, queue it
  if (!allowed && priority !== 'high') {
    const scheduledFor = getNextSendWindow();

    if (queuePayload) {
      await scheduleEmail(userId, type, { ...queuePayload, to, subject }, scheduledFor);
    }

    await logEmailSend({
      userId,
      type,
      subject,
      status: 'queued',
      sentAt: new Date(),
    });

    console.warn(
      `[NotificationEmail] Daily limit reached (${sent}/${DAILY_SEND_LIMIT}). Queued "${type}" for ${userId} → ${scheduledFor.toISOString()}`
    );

    return { success: true, queued: true, scheduledFor };
  }

  // Even high-priority: if we're truly over, log warning but still try
  if (!allowed && priority === 'high') {
    console.warn(
      `[NotificationEmail] Sending high-priority "${type}" despite limit (${sent}/${DAILY_SEND_LIMIT})`
    );
  }

  // Actually send
  const result = await baseSendEmail(to, subject, react);

  // Log result
  await logEmailSend({
    userId,
    type,
    subject,
    status: result.success ? 'sent' : 'failed',
    messageId: result.messageId,
    error: result.error,
    sentAt: new Date(),
  });

  if (result.success) {
    return { success: true, messageId: result.messageId };
  }

  return { success: false, error: result.error };
}

/**
 * Get the next available send window (tomorrow at 9 AM UTC).
 */
function getNextSendWindow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}
