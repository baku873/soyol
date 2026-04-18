import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markAsRead } from '@/services/notification.service';

/**
 * POST /api/notifications/mark-read/:id
 * Mark a single notification as read.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    const updated = await markAsRead(id, userId);

    if (!updated) {
      return NextResponse.json(
        { error: 'Notification not found or already read' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/notifications/mark-read/:id]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
