import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const VISIBILITY_KEYS = ['profilePublic', 'showPhone', 'showOnline'] as const;

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            profilePublic: user.profilePublic ?? true,
            showPhone: user.showPhone ?? false,
            showOnline: user.showOnline ?? true,
            dataUsageConsent: user.dataUsageConsent ?? true,
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, phone } = body;

        // Build update object with only provided fields
        const updateFields: Record<string, any> = { updatedAt: new Date() };
        if (name !== undefined) updateFields.name = name;
        if (email !== undefined) updateFields.email = email;
        if (phone !== undefined) updateFields.phone = phone;

        // Visibility toggles
        for (const key of VISIBILITY_KEYS) {
            if (typeof body[key] === 'boolean') {
                updateFields[key] = body[key];
            }
        }

        if (typeof body.dataUsageConsent === 'boolean') {
            updateFields.dataUsageConsent = body.dataUsageConsent;
        }

        const usersCollection = await getCollection('users');
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateFields }
        );

        return NextResponse.json({ success: true, message: 'Профайл амжилттай шинэчлэгдлээ' });

    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
