import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastAdminConversationUpdate } from '@/lib/messageBroadcast';
import { dispatchToUser } from '@/services/notification.dispatcher';
import type { Conversation } from '@/types/Support';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await auth();
    if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status } = body; // 'resolved' or 'closed'

    const col = await getCollection<Conversation>('support_conversations');
    const conversation = await col.findOne({ _id: new ObjectId(id) });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const updateData: any = { status };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    await col.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    broadcastAdminConversationUpdate({
      id,
      status
    }).catch(console.error);

    dispatchToUser(conversation.userId.toString(), {
      type: 'admin_message_replied',
      title: 'Хүсэлт шийдэгдлээ',
      body: `Таны '${conversation.subject}' сэдэвтэй хүсэлт хаагдлаа.`,
      data: { url: `/messages?id=${id}` }
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resolving conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
