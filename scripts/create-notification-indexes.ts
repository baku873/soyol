/**
 * Create MongoDB indexes for the notification system.
 *
 * Usage:
 *   npx tsx scripts/create-notification-indexes.ts
 *
 * Or add to package.json:
 *   "db:notification-indexes": "tsx scripts/create-notification-indexes.ts"
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Buddha';

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI is not set');
  process.exit(1);
}

async function createIndexes() {
  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    const db = client.db(MONGO_DB);
    console.log(`✅ Connected to ${MONGO_DB}\n`);

    // ── Notifications collection ──────────────────────────────
    const notifications = db.collection('notifications');

    await notifications.createIndex(
      { recipientId: 1, isRead: 1, createdAt: -1 },
      { name: 'idx_recipient_read_created', background: true },
    );
    console.log('  ✓ notifications: { recipientId, isRead, createdAt }');

    await notifications.createIndex(
      { recipientId: 1, type: 1 },
      { name: 'idx_recipient_type', background: true },
    );
    console.log('  ✓ notifications: { recipientId, type }');

    // ── Notification Queue collection ─────────────────────────
    const queue = db.collection('notification_queue');

    await queue.createIndex(
      { status: 1, scheduledFor: 1 },
      { name: 'idx_status_scheduled', background: true },
    );
    console.log('  ✓ notification_queue: { status, scheduledFor }');

    // ── Notification Preferences collection ───────────────────
    const prefs = db.collection('notification_preferences');

    await prefs.createIndex(
      { userId: 1 },
      { name: 'idx_user_unique', unique: true, background: true },
    );
    console.log('  ✓ notification_preferences: { userId } (unique)');

    console.log('\n🎉 All notification indexes created successfully!');
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
