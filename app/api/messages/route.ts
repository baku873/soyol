import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const otherUserId = searchParams.get('otherUserId');

        if (!otherUserId) {
            return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 });
        }

        const messagesCollection = await getCollection('messages');

        // Fetch messages between current user and other user
        const messages = await messagesCollection.find({
            $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId }
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
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { receiverId, content, type, roomName } = body;

        if (!receiverId || !content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const messagesCollection = await getCollection('messages');

        const newMessage = {
            senderId: userId,
            receiverId,
            content,
            type: type || 'text',
            roomName,
            createdAt: new Date(),
            read: false
        };

        const result = await messagesCollection.insertOne(newMessage);

        return NextResponse.json({ ...newMessage, _id: result.insertedId });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
