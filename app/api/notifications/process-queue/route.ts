/**
 * GET /api/notifications/process-queue
 *
 * Cron job endpoint: processes queued emails.
 * Designed to be called every 24 hours (e.g. Vercel Cron at 9 AM).
 *
 * - Fetches up to 90 unprocessed queue items due now
 * - Sends each email
 * - Marks them processed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { getBatchToSend, markProcessed, canSendMore, logEmailSend } from '@/lib/email-queue';
import { sendEmail } from '@/lib/resend';
import { findUserById } from '@/lib/users';
import FlashSaleEmail from '@/emails/FlashSaleEmail';
import WelcomeEmail from '@/emails/WelcomeEmail';
import AbandonedBrowseEmail from '@/emails/AbandonedBrowseEmail';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(req: NextRequest): boolean {
  // Accept Vercel cron secret or internal secret
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;

  const secret = req.headers.get('x-internal-secret');
  if (secret && INTERNAL_SECRET && secret === INTERNAL_SECRET) return true;

  // In development, allow unauthenticated access
  if (process.env.NODE_ENV === 'development') return true;

  return false;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check daily limit
    const { remaining } = await canSendMore();
    const limit = Math.min(remaining, 90);

    if (limit <= 0) {
      return NextResponse.json({
        processed: 0,
        message: 'Daily send limit reached. Will retry tomorrow.',
      });
    }

    // Fetch due queue items
    const batch = await getBatchToSend(limit);

    if (batch.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No queued emails to process.',
      });
    }

    let sentCount = 0;
    let failCount = 0;
    const processedIds: ObjectId[] = [];

    for (const item of batch) {
      try {
        const payload = JSON.parse(item.payload);
        const { to, subject, firstName } = payload;

        if (!to) {
          // Try to get email from user
          const user = await findUserById(item.userId);
          if (!user?.email) {
            processedIds.push(item._id!);
            failCount++;
            continue;
          }
          payload.to = user.email;
          payload.firstName = payload.firstName || user.name?.split(' ')[0] || 'Friend';
        }

        // Build the React component based on type
        let reactElement;
        switch (item.type) {
          case 'welcome':
            reactElement = createElement(WelcomeEmail, {
              firstName: payload.firstName || 'Friend',
              userId: item.userId,
            });
            break;
          case 'flash_sale':
            reactElement = createElement(FlashSaleEmail, {
              firstName: payload.firstName || 'Friend',
              userId: item.userId,
            });
            break;
          case 'abandoned_browse':
            reactElement = createElement(AbandonedBrowseEmail, {
              firstName: payload.firstName || 'Friend',
              userId: item.userId,
            });
            break;
          default:
            reactElement = createElement(FlashSaleEmail, {
              firstName: payload.firstName || 'Friend',
              userId: item.userId,
            });
        }

        const result = await sendEmail(
          payload.to,
          payload.subject || subject || 'Special offer from Soyol!',
          reactElement,
        );

        await logEmailSend({
          userId: item.userId,
          type: item.type,
          subject: payload.subject || subject || 'Queued email',
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error,
          sentAt: new Date(),
        });

        if (result.success) {
          sentCount++;
        } else {
          failCount++;
        }

        processedIds.push(item._id!);
      } catch (itemErr) {
        console.error(`[process-queue] Failed to process item ${item._id}:`, itemErr);
        processedIds.push(item._id!);
        failCount++;
      }
    }

    // Mark all as processed
    await markProcessed(processedIds);

    return NextResponse.json({
      processed: processedIds.length,
      sent: sentCount,
      failed: failCount,
    });
  } catch (err) {
    console.error('[process-queue] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
