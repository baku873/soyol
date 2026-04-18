import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { broadcastTypingIndicator } from '@/lib/messageBroadcast';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { conversationId, isTyping } = body;

    if (!conversationId || typeof isTyping !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await broadcastTypingIndicator(conversationId, userId, isTyping);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting typing indicator:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
