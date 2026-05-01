import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const col = await getCollection('sessions');
        const sessions = await col
            .find({ userId, revokedAt: { $exists: false } })
            .sort({ lastSeen: -1 })
            .toArray();

        return NextResponse.json(
            sessions.map((s) => ({
                _id: s._id.toString(),
                device: s.device || 'Тодорхойгүй төхөөрөмж',
                ip: s.ip || 'unknown',
                createdAt: s.createdAt,
                lastSeen: s.lastSeen,
                sessionToken: s.sessionToken,
            }))
        );
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
