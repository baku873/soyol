/**
 * GET /api/notifications/email-stats
 *
 * Returns email sending statistics for the admin dashboard.
 * Protected: admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { getEmailStats, DAILY_SEND_LIMIT } from '@/lib/email-queue';
import { ObjectId } from 'mongodb';
import type { User } from '@/types/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin
    const users = await getCollection<User>('users');
    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const stats = await getEmailStats();

    // Get subscriber count
    const totalUsers = await users.countDocuments({ email: { $exists: true, $ne: null as any } });
    const subscribedUsers = await users.countDocuments({
      email: { $exists: true, $ne: null },
      subscribedToEmails: { $ne: false },
    } as any);

    // Get recent email logs
    const logs = await getCollection('emailLogs');
    const recentLogs = await logs
      .find({})
      .sort({ sentAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      dailyLimit: DAILY_SEND_LIMIT,
      sentToday: stats.sentToday,
      totalSent: stats.totalSent,
      totalFailed: stats.totalFailed,
      pendingQueue: stats.pendingQueue,
      totalUsers,
      subscribedUsers,
      recentLogs: recentLogs.map((l) => ({
        id: l._id?.toString(),
        userId: l.userId,
        type: l.type,
        subject: l.subject,
        status: l.status,
        sentAt: l.sentAt,
        error: l.error,
      })),
    });
  } catch (err) {
    console.error('[email-stats] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
