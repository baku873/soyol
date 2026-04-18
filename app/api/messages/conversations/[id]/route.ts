import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import type { Conversation } from '@/types/Support';

// GET: Get specific conversation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const col = await getCollection<Conversation>('support_conversations');
    
    const query: any = { _id: new ObjectId(id) };
    if (role !== 'admin') {
      query.userId = new ObjectId(userId);
    }

    const conversation = await col.findOne(query);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
