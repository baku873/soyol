import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserPreferences,
  updateUserPreferences,
} from '@/services/notification.service';
import {
  CONFIGURABLE_NOTIFICATION_TYPES,
  type NotificationPreferences,
} from '@/types/Notification';

/**
 * GET /api/notifications/preferences
 * Get the authenticated user's notification preferences.
 * Returns defaults if no preferences exist yet.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prefs = await getUserPreferences(userId);

    return NextResponse.json({ preferences: prefs.preferences });
  } catch (error) {
    console.error('[GET /api/notifications/preferences]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 * Update the authenticated user's notification preferences (partial merge).
 *
 * Body: { preferences: { order_placed: { inApp: true, email: false }, ... } }
 */
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid preferences object' },
        { status: 400 },
      );
    }

    // Validate only known keys
    const validKeys = new Set<string>(CONFIGURABLE_NOTIFICATION_TYPES);
    const invalidKeys = Object.keys(preferences).filter((k) => !validKeys.has(k));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid preference keys: ${invalidKeys.join(', ')}` },
        { status: 400 },
      );
    }

    const updated = await updateUserPreferences(
      userId,
      preferences as Partial<NotificationPreferences>,
    );

    return NextResponse.json({ success: true, preferences: updated.preferences });
  } catch (error) {
    console.error('[PUT /api/notifications/preferences]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
