import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Check authentication and admin role
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usersCollection = await getCollection('users');
        const currentUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse query params
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const showDeleted = searchParams.get('showDeleted') === 'true';

        // 3. Build query
        let query: any = {};
        if (search) {
            const regex = new RegExp(search, 'i');
            query = {
                $or: [
                    { name: { $regex: regex } },
                    { phone: { $regex: regex } }
                ]
            };
        }

        // Filter out soft-deleted users unless explicitly requested
        if (!showDeleted) {
            query.status = { $ne: 'deleted' };
        }

        // 4. Fetch users
        const users = await usersCollection
            .find(query)
            .project({
                _id: 1,
                phone: 1,
                name: 1,
                role: 1,
                status: 1,
                createdAt: 1
            })
            .sort({ createdAt: -1 })
            .toArray();

        // 5. Return response
        return NextResponse.json({
            users,
            total: users.length
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        // 1. Check authentication and admin role
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usersCollection = await getCollection('users');
        const currentUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse body
        const body = await req.json();
        const { userId: targetUserId, role } = body;

        if (!targetUserId || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (role !== 'user' && role !== 'admin') {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // 3. Prevent self-demotion
        if (targetUserId === userId) {
            return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
        }

        // 4. Update user role
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(targetUserId) },
            { $set: { role } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Эрх шинэчлэгдлээ' });

    } catch (error) {
        console.error('Error updating user role:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usersCollection = await getCollection('users');
        const currentUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get('id');

        if (!targetId || !ObjectId.isValid(targetId)) {
            return NextResponse.json({ error: 'Missing or invalid user id' }, { status: 400 });
        }

        // Prevent self-deletion
        if (targetId === userId) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(targetId) },
            { $set: { status: 'deleted', deletedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Хэрэглэгч устгагдлаа' });

    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

