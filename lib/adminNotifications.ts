import { getCollection } from '@/lib/mongodb';

export async function notifyAdminNewOrder(orderId: string, customerName: string, total: number) {
    try {
        const usersCollection = await getCollection('users');
        const notificationsCollection = await getCollection('notifications');

        const admins = await usersCollection.find({ role: 'admin' }).toArray();

        if (admins.length > 0) {
            const notifications = admins.map(admin => ({
                userId: admin._id.toString(),
                title: '🛒 Шинэ захиалга баталгаажлаа!',
                message: `${customerName} хэрэглэгчээс - ${total}₮`,
                type: 'order',
                isRead: false,
                link: `/admin/orders`, // Cannot use orderId in link because they go to table, wait: '/admin/orders' is fine.
                createdAt: new Date()
            }));

            await notificationsCollection.insertMany(notifications);
            console.log(`[AdminNotifications] Sent notifications to ${admins.length} admins for order ${orderId}`);
        }
    } catch (error) {
        console.error('Failed to send admin notifications:', error);
    }
}
