import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastAdminConversationUpdate } from '@/lib/messageBroadcast';
import type { Conversation, SupportMessage } from '@/types/Support';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const convCol = await getCollection<Conversation>('support_conversations');
    const conversation = await convCol.findOne({ _id: new ObjectId(id) });
    
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const isAdmin = role === 'admin';
    if (!isAdmin && conversation.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateQuery = isAdmin ? { unreadByAdmin: 0 } : { unreadByUser: 0 };
    
    await convCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateQuery }
    );

    // Also mark messages as read
    const msgCol = await getCollection<SupportMessage>('support_messages');
    const senderTypeToMark = isAdmin ? 'user' : 'admin';
    await msgCol.updateMany(
      { conversationId: new ObjectId(id), senderType: senderTypeToMark, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    if (isAdmin) {
      broadcastAdminConversationUpdate({
        id,
        unreadByAdmin: 0
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
