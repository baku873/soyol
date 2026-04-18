/**
 * Email Notification Service
 *
 * Each function:
 * 1. Finds user → gets email
 * 2. Checks notification preferences for that type
 * 3. Sends via Resend if email preference is enabled
 * 4. Updates Notification.isEmailSent / emailSentAt
 * 5. Logs to NotificationQueue
 */

import { ObjectId } from 'mongodb';
import * as React from 'react';
import { SignJWT } from 'jose';

import { getCollection } from '@/lib/mongodb';
import { sendEmail, type SendEmailResult } from '@/lib/resend';
import { getUserPreferences } from '@/services/notification.service';
import type { User } from '@/types/User';
import type { ConfigurableNotificationType } from '@/types/Notification';

import { ProductAddedEmail } from '@/emails/ProductAddedEmail';
import { ProductComingSoonEmail } from '@/emails/ProductComingSoonEmail';
import { ProductOnSaleEmail } from '@/emails/ProductOnSaleEmail';
import { NewProductEmail } from '@/emails/NewProductEmail';
import { OrderPlacedEmail } from '@/emails/OrderPlacedEmail';
import { OrderShippedEmail } from '@/emails/OrderShippedEmail';
import { OrderDeliveredEmail } from '@/emails/OrderDeliveredEmail';
import { OrderCancelledEmail } from '@/emails/OrderCancelledEmail';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://soyol.mn';

// ── Helpers ──

async function getUser(userId: string): Promise<User | null> {
  const col = await getCollection<User>('users');
  return col.findOne({ _id: new ObjectId(userId) });
}

function getUnsubSecret(): Uint8Array {
  const s = process.env.JWT_SECRET || process.env.UNSUBSCRIBE_SECRET || '';
  return new TextEncoder().encode(s);
}

async function generateUnsubscribeUrl(userId: string, type: string): Promise<string> {
  const token = await new SignJWT({ userId, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getUnsubSecret());
  return `${BASE_URL}/api/notifications/unsubscribe?token=${token}&type=${type}`;
}

async function canSendEmail(userId: string, type: ConfigurableNotificationType): Promise<boolean> {
  const prefs = await getUserPreferences(userId);
  const pref = prefs.preferences[type];
  return pref ? pref.email : true; // default = enabled
}

async function markEmailSent(notificationId: string | ObjectId): Promise<void> {
  const col = await getCollection('notifications');
  const oid = typeof notificationId === 'string' ? new ObjectId(notificationId) : notificationId;
  await col.updateOne({ _id: oid }, { $set: { isEmailSent: true, emailSentAt: new Date() } });
}

async function logQueue(notificationId: string, channel: 'email', result: SendEmailResult): Promise<void> {
  const col = await getCollection('notification_queue');
  await col.insertOne({
    notificationId: new ObjectId(notificationId),
    channel,
    status: result.success ? 'sent' : 'failed',
    attempts: result.attempts,
    maxAttempts: 3,
    lastAttemptAt: new Date(),
    error: result.error || null,
    scheduledFor: new Date(),
    createdAt: new Date(),
  });
}

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

async function sendNotifEmail(
  userId: string,
  type: ConfigurableNotificationType,
  subject: string,
  component: React.ReactElement,
  notificationId?: string,
): Promise<EmailSendResult> {
  // 1. Find user
  const user = await getUser(userId);
  if (!user?.email) return { success: false, skipped: true, reason: 'no_email' };

  // 2. Check preferences
  const allowed = await canSendEmail(userId, type);
  if (!allowed) return { success: false, skipped: true, reason: 'preference_disabled' };

  // 3. Send
  const result = await sendEmail(user.email, subject, component);

  // 4. Update notification
  if (notificationId && result.success) {
    await markEmailSent(notificationId).catch(() => {});
  }

  // 5. Log queue
  if (notificationId) {
    await logQueue(notificationId, 'email', result).catch(() => {});
  }

  console.log(`[EmailService] ${type} → ${user.email}: ${result.success ? 'sent' : 'failed'}`);
  return { success: result.success, messageId: result.messageId, error: result.error };
}

// ══════════════════════════════════════════
// PRODUCT EMAILS
// ══════════════════════════════════════════

export async function sendProductAddedEmail(
  userId: string,
  product: { name: string; image?: string; price: number; productId: string },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'product_added');
  return sendNotifEmail(userId, 'product_added', `Шинэ бараа: ${product.name}`,
    React.createElement(ProductAddedEmail, {
      productName: product.name, productImage: product.image,
      productPrice: product.price, productId: product.productId, unsubscribeUrl: unsub,
    }), notificationId);
}

export async function sendProductComingSoonEmail(
  userId: string,
  product: { name: string; image?: string; productId: string; launchDate?: string },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'product_coming_soon');
  return sendNotifEmail(userId, 'product_coming_soon', `Тун удахгүй: ${product.name}`,
    React.createElement(ProductComingSoonEmail, {
      productName: product.name, productImage: product.image,
      productId: product.productId, launchDate: product.launchDate, unsubscribeUrl: unsub,
    }), notificationId);
}

export async function sendProductOnSaleEmail(
  userId: string,
  product: { name: string; image?: string; productId: string; originalPrice: number; salePrice: number; discountPercent: number; saleEndDate?: string },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'product_on_sale');
  return sendNotifEmail(userId, 'product_on_sale', `${product.discountPercent}% хямдрал: ${product.name}`,
    React.createElement(ProductOnSaleEmail, { ...product, productName: product.name, productImage: product.image, unsubscribeUrl: unsub }),
    notificationId);
}

export async function sendNewProductEmail(
  userId: string,
  products: { name: string; image?: string; price: number; productId: string }[],
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'new_product');
  return sendNotifEmail(userId, 'new_product', 'Шинэ бараанууд ирлээ ✨',
    React.createElement(NewProductEmail, { products, unsubscribeUrl: unsub }),
    notificationId);
}

// ══════════════════════════════════════════
// ORDER EMAILS
// ══════════════════════════════════════════

export async function sendOrderPlacedEmail(
  userId: string,
  order: { id: string; fullName: string; items: { name: string; image?: string; quantity: number; price: number }[]; subtotal: number; shippingCost: number; total: number; address: string; city: string; estimatedDelivery?: string },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'order_placed');
  return sendNotifEmail(userId, 'order_placed', `Захиалга #${order.id.slice(-6).toUpperCase()} баталгаажлаа`,
    React.createElement(OrderPlacedEmail, { orderId: order.id, ...order, unsubscribeUrl: unsub }),
    notificationId);
}

export async function sendOrderShippedEmail(
  userId: string,
  order: { id: string; fullName: string },
  tracking: { trackingNumber: string; carrierName: string; trackingUrl?: string; estimatedDelivery?: string },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'order_shipped');
  return sendNotifEmail(userId, 'order_shipped', `Захиалга #${order.id.slice(-6).toUpperCase()} илгээгдлээ`,
    React.createElement(OrderShippedEmail, { orderId: order.id, fullName: order.fullName, ...tracking, unsubscribeUrl: unsub }),
    notificationId);
}

export async function sendOrderDeliveredEmail(
  userId: string,
  order: { id: string; fullName: string; items: { name: string; image?: string; productId: string }[] },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'order_delivered');
  return sendNotifEmail(userId, 'order_delivered', `Захиалга #${order.id.slice(-6).toUpperCase()} хүргэгдлээ!`,
    React.createElement(OrderDeliveredEmail, { orderId: order.id, fullName: order.fullName, items: order.items, unsubscribeUrl: unsub }),
    notificationId);
}

export async function sendOrderCancelledEmail(
  userId: string,
  order: { id: string; fullName: string; refundAmount: number; refundTimeline?: string; reason?: string },
  notificationId?: string,
) {
  const unsub = await generateUnsubscribeUrl(userId, 'order_cancelled');
  return sendNotifEmail(userId, 'order_cancelled', `Захиалга #${order.id.slice(-6).toUpperCase()} цуцлагдлаа`,
    React.createElement(OrderCancelledEmail, { orderId: order.id, ...order, unsubscribeUrl: unsub }),
    notificationId);
}
