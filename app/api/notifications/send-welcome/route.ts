/**
 * POST /api/notifications/send-welcome
 *
 * Send a Temu-style welcome email to a user.
 * Protected: requires valid auth session OR x-internal-secret header.
 *
 * Body: { userId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { auth } from '@/lib/auth';
import { findUserById } from '@/lib/users';
import { sendNotificationEmail } from '@/lib/notification-email';
import WelcomeEmail from '@/emails/WelcomeEmail';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Check internal secret header
  const secret = req.headers.get('x-internal-secret');
  if (secret && INTERNAL_SECRET && secret === INTERNAL_SECRET) return true;

  // Check session
  const session = await auth();
  return !!session.userId;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User has no email address' }, { status: 400 });
    }

    // Check subscription preference
    const subscribedToEmails = (user as any).subscribedToEmails !== false;
    if (!subscribedToEmails) {
      return NextResponse.json({ error: 'User has unsubscribed from emails' }, { status: 400 });
    }

    const firstName = user.name?.split(' ')[0] || 'Friend';

    const result = await sendNotificationEmail({
      to: user.email,
      userId: userId,
      subject: '🎉 Welcome! FREE SHIPPING unlocked on your first order!',
      type: 'welcome',
      priority: 'high', // Welcome emails always send immediately
      react: createElement(WelcomeEmail, { firstName, userId }),
      queuePayload: { firstName },
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      queued: result.queued || false,
      error: result.error,
    });
  } catch (err) {
    console.error('[send-welcome] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
