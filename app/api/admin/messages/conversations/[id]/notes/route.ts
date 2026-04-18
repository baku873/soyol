import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastNewMessage } from '@/lib/messageBroadcast';
import type { Conversation, SupportMessage } from '@/types/Support';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { note } = body;

    if (!note) return NextResponse.json({ error: 'Note is required' }, { status: 400 });

    const convCol = await getCollection<Conversation>('support_conversations');
    const conversation = await convCol.findOne({ _id: new ObjectId(id) });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const now = new Date();
    const newMsg: SupportMessage = {
      conversationId: new ObjectId(id),
      senderId: new ObjectId(userId!),
      senderType: 'admin',
      body: note,
      isRead: true, // internal notes are considered read
      createdAt: now,
      isInternal: true
    };

    const msgCol = await getCollection<SupportMessage>('support_messages');
    const result = await msgCol.insertOne(newMsg);

    // Only broadcast to admin channel, not user channel
    broadcastNewMessage(id, {
      id: result.insertedId.toString(),
      conversationId: id,
      senderId: userId!,
      senderType: 'admin',
      body: note,
      isRead: true,
      createdAt: now,
      isInternal: true
    }).catch(console.error);

    return NextResponse.json({ success: true, messageId: result.insertedId });
  } catch (error) {
    console.error('Error adding internal note:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
