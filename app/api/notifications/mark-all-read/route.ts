import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markAllAsRead } from '@/services/notification.service';

/**
 * POST /api/notifications/mark-all-read
 * Mark all unread notifications as read for the authenticated user.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await markAllAsRead(userId);

    return NextResponse.json({ success: true, markedCount: count });
  } catch (error) {
    console.error('[POST /api/notifications/mark-all-read]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
