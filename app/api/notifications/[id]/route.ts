import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteNotification } from '@/services/notification.service';

/**
 * DELETE /api/notifications/:id
 * Delete a single notification for the authenticated user.
 */
export async function DELETE(
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

    const deleted = await deleteNotification(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/notifications/:id]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
