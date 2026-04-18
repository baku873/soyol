import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createNotification, getUserNotifications } from '@/services/notification.service';
import { NotificationType, NOTIFICATION_TYPES } from '@/types/Notification';

/**
 * GET /api/notifications
 * Paginated notification list for the authenticated user.
 *
 * Query params:
 *   page  — page number (default 1)
 *   limit — items per page (default 20, max 100)
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const result = await getUserNotifications(userId, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Create a notification (admin only).
 *
 * Body: { recipientId, type, title, body, data?, channels?, priority? }
 */
export async function POST(req: Request) {
  try {
    const { userId, role } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { recipientId, type, title, body: notifBody, data, channels, priority } = body;

    if (!recipientId || !title || !notifBody) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientId, title, body' },
        { status: 400 },
      );
    }

    if (type && !(NOTIFICATION_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type: ${type}` },
        { status: 400 },
      );
    }

    const notification = await createNotification({
      recipientId,
      type: (type as NotificationType) || 'admin_message_received',
      title,
      body: notifBody,
      data,
      channels,
      priority,
    });

    return NextResponse.json({
      success: true,
      notificationId: notification._id,
    });
  } catch (error) {
    console.error('[POST /api/notifications]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
