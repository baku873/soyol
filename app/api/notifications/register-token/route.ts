import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { User, PushToken } from '@/types/User';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { token, platform } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const usersCollection = await getCollection<User>('users');

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const existingTokens = user?.pushTokens || [];
        const isAlreadyRegistered = existingTokens.some((pt: PushToken) => pt.token === token);

        if (!isAlreadyRegistered) {
            const newToken: PushToken = {
                token,
                platform: (platform as string) || 'unknown',
                createdAt: new Date()
            };

            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $push: { 
                        pushTokens: newToken
                    } as any // Cast to any carefully if Mongo types are still being strict
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error registering push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
