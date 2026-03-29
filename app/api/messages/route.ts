import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const { userId: authUserId, role: authRole } = await auth();
        const guestId = req.headers.get('x-guest-id');
        const userId = authUserId || guestId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const otherUserId = searchParams.get('otherUserId');

        if (!otherUserId) {
            return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 });
        }

        const messagesCollection = await getCollection('messages');

        // If the user is an admin, they act as the unified "support_admin" for customer chats
        // Exception: If they are trying to fetch messages with 'support_admin' themselves,
        // it means they are testing or something else, but generally admins represent support.
        const effectiveUserId = authRole === 'admin' ? 'support_admin' : userId;

        // Auto-mark messages as read
        await messagesCollection.updateMany(
            { senderId: otherUserId, receiverId: effectiveUserId, read: false },
            { $set: { read: true } }
        );

        const messages = await messagesCollection.find({
            $or: [
                { senderId: effectiveUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: effectiveUserId }
            ]
        }).sort({ createdAt: 1 }).toArray();

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId: authUserId, role: authRole } = await auth();
        const guestId = req.headers.get('x-guest-id');
        const userId = authUserId || guestId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { receiverId, content, type, roomName } = body;

        if (!receiverId || !content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const messagesCollection = await getCollection('messages');

        const effectiveSenderId = authRole === 'admin' ? 'support_admin' : userId;

        const newMessage = {
            senderId: effectiveSenderId,
            receiverId,
            content,
            type: type || 'text',
            roomName,
            createdAt: new Date(),
            read: false,
            // Track which actual admin sent the message
            realSenderId: authUserId 
        };

        const result = await messagesCollection.insertOne(newMessage);

        return NextResponse.json({ ...newMessage, _id: result.insertedId });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
