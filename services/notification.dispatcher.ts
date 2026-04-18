import { getCollection } from '@/lib/mongodb';
import { createNotification } from '@/services/notification.service';
import * as EmailService from '@/services/email.service';
import type { NotificationType, NotificationPriority } from '@/types/Notification';

interface DispatchPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  type: NotificationType;
  // Specific payloads for emails
  productData?: any;
  orderData?: any;
}

/**
 * Dispatch a notification to a specific user.
 */
export async function dispatchToUser(userId: string, payload: DispatchPayload) {
  try {
    // 1. Create notification in MongoDB (this handles preference checking and Ably broadcasting)
    const notification = await createNotification({
      recipientId: userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: payload.priority,
    });

    // 2. If preferences allow email, send it
    if (notification.channels.includes('email')) {
      const notifId = notification._id.toString();
      
      switch (payload.type) {
        case 'product_added':
          if (payload.productData) await EmailService.sendProductAddedEmail(userId, payload.productData, notifId);
          break;
        case 'product_coming_soon':
          if (payload.productData) await EmailService.sendProductComingSoonEmail(userId, payload.productData, notifId);
          break;
        case 'product_on_sale':
          if (payload.productData) await EmailService.sendProductOnSaleEmail(userId, payload.productData, notifId);
          break;
        case 'new_product':
          if (payload.productData) await EmailService.sendNewProductEmail(userId, payload.productData, notifId);
          break;
        case 'order_placed':
          if (payload.orderData) await EmailService.sendOrderPlacedEmail(userId, payload.orderData, notifId);
          break;
        case 'order_shipped':
          if (payload.orderData) await EmailService.sendOrderShippedEmail(userId, payload.orderData.order, payload.orderData.tracking, notifId);
          break;
        case 'order_delivered':
          if (payload.orderData) await EmailService.sendOrderDeliveredEmail(userId, payload.orderData, notifId);
          break;
        case 'order_cancelled':
          if (payload.orderData) await EmailService.sendOrderCancelledEmail(userId, payload.orderData, notifId);
          break;
        // order_confirmed email uses the old legacy wrapper or could be added to email service
      }
    }
  } catch (error) {
    console.error(`[Dispatcher] Failed to dispatch to user ${userId}:`, error);
  }
}

/**
 * Dispatch a notification to multiple users.
 */
export async function dispatchBatch(userIds: string[], payload: DispatchPayload) {
  for (const userId of userIds) {
    // Run sequentially or concurrently based on load. Using simple loop for reliability.
    await dispatchToUser(userId, payload);
  }
}

/**
 * Dispatch a notification to all users.
 */
export async function dispatchToAllUsers(payload: DispatchPayload) {
  try {
    const col = await getCollection('users');
    const users = await col.find({}, { projection: { _id: 1 } }).toArray();
    const userIds = users.map(u => u._id.toString());
    
    // Background dispatch
    setImmediate(() => {
      dispatchBatch(userIds, payload).catch(console.error);
    });
  } catch (error) {
    console.error(`[Dispatcher] Failed to dispatch to all users:`, error);
  }
}

/**
 * Dispatch a notification to all admins.
 */
export async function dispatchToAdmins(payload: DispatchPayload) {
  try {
    const col = await getCollection('users');
    const admins = await col.find({ role: 'admin' }, { projection: { _id: 1 } }).toArray();
    const adminIds = admins.map(a => a._id.toString());
    
    // Change recipientType to admin for these notifications if needed, 
    // or just send normally.
    setImmediate(() => {
      dispatchBatch(adminIds, payload).catch(console.error);
    });
  } catch (error) {
    console.error(`[Dispatcher] Failed to dispatch to admins:`, error);
  }
}
