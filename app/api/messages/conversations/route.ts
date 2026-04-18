import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastAdminConversationUpdate } from '@/lib/messageBroadcast';
import { dispatchToAdmins } from '@/services/notification.dispatcher';
import type { Conversation, SupportMessage } from '@/types/Support';

// GET: List user's conversations
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const col = await getCollection<Conversation>('support_conversations');
    const conversations = await col.find({ userId: new ObjectId(userId) })
                                   .sort({ lastMessageAt: -1 })
                                   .toArray();

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new conversation
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subject, priority = 'normal', message } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const { clientPromise } = await import('@/lib/mongodb');
    const client = await clientPromise;
    const session = client.startSession();

    let convId: string;
    const now = new Date();

    try {
      await session.withTransaction(async () => {
        const db = client.db();
        const convCol = db.collection<Conversation>('support_conversations');
        const msgCol = db.collection<SupportMessage>('support_messages');

        const newConv: Conversation = {
          userId: new ObjectId(userId),
          assignedAdminId: null,
          status: 'open',
          subject,
          priority,
          lastMessageAt: now,
          lastMessagePreview: message.substring(0, 50),
          unreadByAdmin: 1,
          unreadByUser: 0,
          createdAt: now,
        };

        const convResult = await convCol.insertOne(newConv, { session });
        convId = convResult.insertedId.toString();

        const newMsg: SupportMessage = {
          conversationId: convResult.insertedId,
          senderId: new ObjectId(userId),
          senderType: 'user',
          body: message,
          isRead: false,
          createdAt: now,
        };

        await msgCol.insertOne(newMsg, { session });
      });
    } finally {
      await session.endSession();
    }

    // Broadcast to Admin Queue
    broadcastAdminConversationUpdate({
      id: convId!,
      userId: new ObjectId(userId),
      status: 'open',
      subject,
      priority,
      lastMessageAt: now,
      unreadByAdmin: 1
    }).catch(console.error);

    // Dispatch Notification to Admins
    dispatchToAdmins({
      type: 'admin_message_received',
      priority: priority === 'urgent' ? 'high' : 'normal',
      title: 'Шинэ хүсэлт ирлээ',
      body: `Сэдэв: ${subject}`,
      data: { url: `/admin/messages?conversationId=${convId!}` }
    }).catch(console.error);

    return NextResponse.json({ success: true, conversationId: convId! }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
