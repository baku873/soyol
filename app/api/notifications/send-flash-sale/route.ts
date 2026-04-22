/**
 * POST /api/notifications/send-flash-sale
 *
 * Send a flash sale email to specific users or ALL subscribed users.
 * Protected: requires x-internal-secret header or admin session.
 *
 * Body: { userIds?: string[] }
 *   - If userIds provided, send only to those users
 *   - If omitted, send to ALL users where subscribedToEmails !== false
 *
 * Implements batching: first 90 send now, rest queued 24h apart.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { sendNotificationEmail } from '@/lib/notification-email';
import { canSendMore, scheduleEmail } from '@/lib/email-queue';
import FlashSaleEmail from '@/emails/FlashSaleEmail';
import type { User } from '@/types/User';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;

async function isAuthorizedAdmin(req: NextRequest): Promise<boolean> {
  const secret = req.headers.get('x-internal-secret');
  if (secret && INTERNAL_SECRET && secret === INTERNAL_SECRET) return true;

  const session = await auth();
  if (!session.userId) return false;

  // Check admin role
  const users = await getCollection<User>('users');
  const { ObjectId } = await import('mongodb');
  const user = await users.findOne({ _id: new ObjectId(session.userId) });
  return user?.role === 'admin';
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { userIds } = body as { userIds?: string[] };

    const users = await getCollection<User>('users');

    // Build target list
    let targets: User[];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const { ObjectId } = await import('mongodb');
      targets = await users
        .find({
          _id: { $in: userIds.map((id) => new ObjectId(id)) },
          email: { $exists: true, $ne: null as any },
        })
        .toArray();
    } else {
      // All subscribed users with email
      targets = await users
        .find({
          email: { $exists: true, $ne: null },
          subscribedToEmails: { $ne: false },
        } as any)
        .toArray();
    }

    // Filter out unsubscribed
    targets = targets.filter((u) => (u as any).subscribedToEmails !== false && u.email);

    if (targets.length === 0) {
      return NextResponse.json({ sendingNow: 0, queued: 0, message: 'No eligible users found' });
    }

    // Check how many we can send now
    const { remaining } = await canSendMore();
    const BATCH_SIZE = Math.min(remaining, 90);

    const sendNow = targets.slice(0, BATCH_SIZE);
    const sendLater = targets.slice(BATCH_SIZE);

    // Send immediate batch
    let sentCount = 0;
    let failCount = 0;

    for (const user of sendNow) {
      const firstName = user.name?.split(' ')[0] || 'Friend';
      const userId = user._id!.toString();

      const result = await sendNotificationEmail({
        to: user.email!,
        userId,
        subject: '😱 FLASH SALE — Prices Dropping Every Minute!',
        type: 'flash_sale',
        priority: 'bulk',
        react: createElement(FlashSaleEmail, { firstName, userId }),
        queuePayload: { firstName },
      });

      if (result.success && !result.queued) {
        sentCount++;
      } else if (!result.success) {
        failCount++;
      }
    }

    // Queue remaining batches (90 per day, 24 hours apart)
    let queuedCount = 0;
    const QUEUE_BATCH = 90;

    for (let i = 0; i < sendLater.length; i++) {
      const user = sendLater[i];
      const batchIndex = Math.floor(i / QUEUE_BATCH);
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + batchIndex + 1);
      scheduledFor.setHours(9, 0, 0, 0); // 9 AM next day(s)

      const firstName = user.name?.split(' ')[0] || 'Friend';
      const userId = user._id!.toString();

      await scheduleEmail(userId, 'flash_sale', {
        to: user.email!,
        subject: '😱 FLASH SALE — Prices Dropping Every Minute!',
        firstName,
      }, scheduledFor);

      queuedCount++;
    }

    return NextResponse.json({
      sendingNow: sentCount,
      failed: failCount,
      queued: queuedCount,
      totalTargets: targets.length,
    });
  } catch (err) {
    console.error('[send-flash-sale] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
