import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastNewMessage, broadcastAdminConversationUpdate } from '@/lib/messageBroadcast';
import { dispatchToUser, dispatchToAdmins } from '@/services/notification.dispatcher';
import type { Conversation, SupportMessage } from '@/types/Support';

// GET: Get messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const convCol = await getCollection<Conversation>('support_conversations');
    
    // Auth check
    const query: any = { _id: new ObjectId(id) };
    if (role !== 'admin') {
      query.userId = new ObjectId(userId);
    }
    const conversation = await convCol.findOne(query);
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const msgCol = await getCollection<SupportMessage>('support_messages');
    const messages = await msgCol.find({ conversationId: new ObjectId(id) })
                                 .sort({ createdAt: 1 }) // oldest first for chat flow
                                 .toArray();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Send a new message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { message, attachments } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const convCol = await getCollection<Conversation>('support_conversations');
    const conversation = await convCol.findOne({ _id: new ObjectId(id) });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const isAdmin = role === 'admin';
    
    if (!isAdmin && conversation.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const newMsg: SupportMessage = {
      conversationId: new ObjectId(id),
      senderId: new ObjectId(userId),
      senderType: isAdmin ? 'admin' : 'user',
      body: message,
      attachments: attachments || [],
      isRead: false,
      createdAt: now,
    };

    const msgCol = await getCollection<SupportMessage>('support_messages');
    const result = await msgCol.insertOne(newMsg);

    // Update conversation
    const updateData: any = {
      lastMessageAt: now,
      lastMessagePreview: message.substring(0, 50),
    };

    if (isAdmin) {
      updateData.$inc = { unreadByUser: 1 };
      // Assign to this admin if not assigned yet
      if (!conversation.assignedAdminId) {
        updateData.assignedAdminId = new ObjectId(userId);
      }
      updateData.status = 'active'; // Admin replied
    } else {
      updateData.$inc = { unreadByAdmin: 1 };
      if (conversation.status === 'resolved' || conversation.status === 'closed') {
         updateData.status = 'open'; // Reopen if user replies
      }
    }

    const { $inc, ...setFields } = updateData;
    const updateQuery: any = { $set: setFields };
    if ($inc) updateQuery.$inc = $inc;

    await convCol.updateOne({ _id: new ObjectId(id) }, updateQuery);

    // 1. Broadcast to the conversation room
    broadcastNewMessage(id, {
      id: result.insertedId.toString(),
      conversationId: id,
      senderId: userId,
      senderType: newMsg.senderType,
      body: newMsg.body,
      attachments: newMsg.attachments,
      isRead: false,
      createdAt: newMsg.createdAt,
    }).catch(console.error);

    // 2. Broadcast admin queue update
    broadcastAdminConversationUpdate({
      id,
      lastMessageAt: now,
      lastMessagePreview: setFields.lastMessagePreview,
      status: setFields.status || conversation.status,
    }).catch(console.error);

    // 3. Dispatch Notifications
    if (isAdmin) {
      dispatchToUser(conversation.userId.toString(), {
        type: 'admin_message_replied',
        title: 'Шинэ зурвас ирлээ',
        body: 'Админ танд хариу илгээлээ.',
        data: { url: `/messages?id=${id}` }
      }).catch(console.error);
    } else {
      // User sent message
      if (conversation.assignedAdminId) {
        dispatchToUser(conversation.assignedAdminId.toString(), {
          type: 'admin_message_received',
          title: 'Хэрэглэгчээс хариу ирлээ',
          body: `Сэдэв: ${conversation.subject}`,
          data: { url: `/admin/messages?conversationId=${id}` }
        }).catch(console.error);
      } else {
        dispatchToAdmins({
          type: 'admin_message_received',
          title: 'Шинэ зурвас ирлээ',
          body: `Сэдэв: ${conversation.subject}`,
          data: { url: `/admin/messages?conversationId=${id}` }
        }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, messageId: result.insertedId });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
