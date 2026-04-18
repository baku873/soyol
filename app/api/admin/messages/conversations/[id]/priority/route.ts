import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastAdminConversationUpdate } from '@/lib/messageBroadcast';
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
    const { priority } = body;

    const col = await getCollection<Conversation>('support_conversations');
    await col.updateOne({ _id: new ObjectId(id) }, { $set: { priority } });

    broadcastAdminConversationUpdate({
      id,
      priority
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating priority:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
