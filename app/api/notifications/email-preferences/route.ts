/**
 * GET/PATCH /api/notifications/email-preferences
 *
 * GET: Returns current user's promotional email subscription status
 * PATCH: Toggle subscribedToEmails field
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { getUserEmailLogs } from '@/lib/email-queue';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getCollection('users');
    const user = await users.findOne(
      { _id: new ObjectId(session.userId) },
      { projection: { subscribedToEmails: 1, email: 1, name: 1, avatar: 1, image: 1 } },
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent email logs
    const recentEmails = await getUserEmailLogs(session.userId, 5);

    return NextResponse.json({
      subscribedToEmails: user.subscribedToEmails !== false,
      email: user.email,
      name: user.name,
      avatar: user.avatar || user.image,
      recentEmails: recentEmails.map((l) => ({
        id: l._id?.toString(),
        type: l.type,
        subject: l.subject,
        status: l.status,
        sentAt: l.sentAt,
      })),
    });
  } catch (err) {
    console.error('[email-preferences GET] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscribedToEmails } = body;

    if (typeof subscribedToEmails !== 'boolean') {
      return NextResponse.json({ error: 'subscribedToEmails must be boolean' }, { status: 400 });
    }

    const users = await getCollection('users');
    await users.updateOne(
      { _id: new ObjectId(session.userId) },
      { $set: { subscribedToEmails, updatedAt: new Date() } },
    );

    return NextResponse.json({ subscribedToEmails });
  } catch (err) {
    console.error('[email-preferences PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
