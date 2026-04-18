import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUnreadCount } from '@/services/notification.service';

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for badge display.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await getUnreadCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('[GET /api/notifications/unread-count]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
