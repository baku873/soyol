import { createNotification } from '@/services/notification.service';
import { sendPushToUser } from '@/lib/fcm';
import { getCollection } from '@/lib/mongodb';

/**
 * Notify all admins about a new order.
 *
 * Uses the centralized notification service for in-app notifications
 * and fires FCM push notifications in parallel.
 */
export async function notifyAdminNewOrder(
  orderId: string,
  customerName: string,
  total: number,
) {
  try {
    const usersCollection = await getCollection('users');
    const admins = await usersCollection.find({ role: 'admin' }).toArray();

    if (admins.length === 0) return;

    // Create in-app notifications via the central service
    const notificationPromises = admins.map((admin) =>
      createNotification({
        recipientId: admin._id.toString(),
        recipientType: 'admin',
        type: 'order_placed',
        title: '🛒 Шинэ захиалга баталгаажлаа!',
        body: `${customerName} хэрэглэгчээс - ${total.toLocaleString()}₮`,
        data: { orderId, url: '/admin/orders' },
        channels: ['in_app'],
        priority: 'high',
      }),
    );

    // Send FCM push to each admin (non-blocking)
    const pushPromises = admins.map((admin) =>
      sendPushToUser({
        userId: admin._id.toString(),
        title: '🛒 Шинэ захиалга!',
        body: `${customerName} - ${total.toLocaleString()}₮`,
        data: { url: '/admin/orders' },
      }).catch((err: unknown) => console.error('FCM admin push error:', err)),
    );

    await Promise.all([...notificationPromises, ...pushPromises]);

    console.log(
      `[AdminNotifications] Sent notifications to ${admins.length} admins for order ${orderId}`,
    );
  } catch (error) {
    console.error('Failed to send admin notifications:', error);
  }
}
