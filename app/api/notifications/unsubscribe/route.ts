/**
 * GET /api/notifications/unsubscribe?token=xxx&type=xxx
 *
 * One-click email unsubscribe. The token is a signed JWT containing
 * { userId, type }. Clicking this URL disables the email channel
 * for that notification type in the user's preferences.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { getUserPreferences } from '@/services/notification.service';
import type { ConfigurableNotificationType } from '@/types/Notification';
import { CONFIGURABLE_NOTIFICATION_TYPES } from '@/types/Notification';

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET || process.env.UNSUBSCRIBE_SECRET || '';
  return new TextEncoder().encode(s);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  // ─── Promotional email unsubscribe (base64 userId, no type param) ───
  if (token && !type) {
    return handlePromotionalUnsubscribe(token);
  }

  if (!token || !type) {
    return renderPage('Буруу холбоос', 'Холбоос буруу байна. Дахин оролдоно уу.', false);
  }

  // Validate type
  if (!(CONFIGURABLE_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return renderPage('Буруу төрөл', `"${type}" нь тохируулах боломжгүй мэдэгдлийн төрөл.`, false);
  }

  // Verify JWT
  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    userId = payload.userId as string;
    if (!userId) throw new Error('Missing userId');
  } catch {
    return renderPage('Хугацаа дууссан', 'Холбоосын хугацаа дууссан эсвэл буруу байна.', false);
  }

  // Update preferences — disable email for this type
  try {
    const prefs = await getUserPreferences(userId);
    const notifType = type as ConfigurableNotificationType;
    if (prefs.preferences[notifType]) {
      prefs.preferences[notifType].email = false;
    }

    const col = await getCollection('notification_preferences');
    await col.updateOne(
      { userId: new ObjectId(userId) },
      { $set: { [`preferences.${type}.email`]: false, updatedAt: new Date() } },
    );

    console.log(`[Unsubscribe] User ${userId} unsubscribed from ${type} emails`);
    return renderPage('Амжилттай', `Та "${typeLabel(notifType)}" мэдэгдлийг имэйлээр хүлээн авахаа зогсоолоо.`, true);
  } catch (err) {
    console.error('[Unsubscribe] Error:', err);
    return renderPage('Алдаа', 'Алдаа гарлаа. Дахин оролдоно уу.', false);
  }
}

/**
 * Handle promotional email unsubscribe (Temu-style emails).
 * Token is base64-encoded userId. Sets subscribedToEmails = false.
 */
async function handlePromotionalUnsubscribe(token: string) {
  let userId: string;
  try {
    userId = Buffer.from(token, 'base64').toString('utf-8');
    new ObjectId(userId); // validate
  } catch {
    return renderPage('Буруу холбоос', 'Холбоос буруу байна.', false);
  }

  try {
    const users = await getCollection('users');
    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { subscribedToEmails: false, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return renderPage('Хэрэглэгч олдсонгүй', 'Таны бүртгэл олдсонгүй.', false);
    }

    console.log(`[Unsubscribe] User ${userId} unsubscribed from promotional emails`);
    return renderPage(
      'Амжилттай',
      'Та сурталчилгааны имэйл хүлээн авахаа зогсоолоо. Dashboard-аас дахин бүртгүүлэх боломжтой.',
      true,
    );
  } catch (err) {
    console.error('[Unsubscribe] Promotional error:', err);
    return renderPage('Алдаа', 'Алдаа гарлаа. Дахин оролдоно уу.', false);
  }
}

const TYPE_LABELS: Record<string, string> = {
  product_added: 'Шинэ бараа нэмэгдсэн',
  product_coming_soon: 'Тун удахгүй ирэх бараа',
  product_on_sale: 'Хямдралтай бараа',
  new_product: 'Шинэ бараа',
  order_placed: 'Захиалга баталгаажсан',
  order_confirmed: 'Захиалга батлагдсан',
  order_shipped: 'Захиалга илгээгдсэн',
  order_delivered: 'Захиалга хүргэгдсэн',
  order_cancelled: 'Захиалга цуцлагдсан',
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

function renderPage(title: string, message: string, success: boolean) {
  const bg = success ? '#22C55E' : '#EF4444';
  const emoji = success ? '✅' : '⚠️';
  const html = `<!DOCTYPE html>
<html lang="mn">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - Soyol Video Shop</title>
<style>
  body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f6f6f6;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#fff;border-radius:20px;padding:48px;max-width:420px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.08)}
  .badge{display:inline-block;background:${bg};color:#fff;font-size:14px;font-weight:700;padding:6px 16px;border-radius:20px;margin-bottom:20px}
  h1{font-size:24px;font-weight:800;color:#1a1a1a;margin:0 0 12px}
  p{font-size:14px;color:#666;line-height:1.6;margin:0 0 24px}
  .cta{display:inline-block;background:#FF5000;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px}
  .footer{margin-top:24px;font-size:12px;color:#999}
</style></head>
<body>
<div class="card">
  <div style="font-size:40px;margin-bottom:16px">${emoji}</div>
  <span class="badge">${title}</span>
  <h1>Soyol Video Shop</h1>
  <p>${message}</p>
  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://soyol.mn'}" class="cta">Нүүр хуудас руу буцах</a>
  <div class="footer">© ${new Date().getFullYear()} Soyol Video Shop</div>
</div>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
