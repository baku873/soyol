/**
 * Legacy email helpers — now delegating to the centralized email service.
 *
 * These wrappers exist for backward compatibility with callers that
 * still import from '@/lib/email'. New code should import directly
 * from '@/services/email.service'.
 */

import { sendEmail } from '@/lib/resend';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmation';
import { OrderStatusUpdateEmail } from '@/emails/OrderStatusUpdate';
import * as React from 'react';

export async function sendOrderConfirmation(order: any, email: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] Skipping send: RESEND_API_KEY not found');
    return;
  }
  return sendEmail(
    email,
    `Захиалга баталгаажлаа #${order.id.slice(-6).toUpperCase()}`,
    React.createElement(OrderConfirmationEmail, { order }),
  );
}

export async function sendOrderStatusUpdate(order: any, email: string, status: any) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] Skipping send: RESEND_API_KEY not found');
    return;
  }
  return sendEmail(
    email,
    `Таны захиалгын төлөв шинэчлэгдлээ: #${order.id.slice(-6).toUpperCase()}`,
    React.createElement(OrderStatusUpdateEmail, { order, newStatus: status, deliveryEstimate: order.deliveryEstimate }),
  );
}
