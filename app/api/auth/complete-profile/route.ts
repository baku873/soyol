import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { signAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';

/**
 * POST /api/auth/complete-profile
 * Called after Google/Facebook OAuth sign-up to set name, phone, and password.
 * Requires the user to be authenticated (JWT cookie).
 */
export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Нэвтэрнэ үү' }, { status: 401 });
        }

        const { name, phone, password } = await request.json();

        if (!name || !phone || !password) {
            return NextResponse.json({ error: 'Бүх талбарыг бөглөнө үү' }, { status: 400 });
        }

        if (phone.length < 8) {
            return NextResponse.json({ error: 'Утасны дугаар буруу байна' }, { status: 400 });
        }

        if (password.length < 4) {
            return NextResponse.json({ error: 'Нууц үг хамгийн багадаа 4 тэмдэгт байх ёстой' }, { status: 400 });
        }

        const users = await getCollection('users');

        // Check if phone is already taken by another user
        const existingPhone = await users.findOne({ phone, _id: { $ne: new ObjectId(userId) } });
        if (existingPhone) {
            return NextResponse.json({ error: 'Энэ дугаар бүртгэлтэй байна' }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user
        await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    name,
                    phone,
                    password: hashedPassword,
                    profileCompleted: true,
                    updatedAt: new Date(),
                },
            }
        );

        const updatedUser = await users.findOne({ _id: new ObjectId(userId) });
        if (!updatedUser) {
            return NextResponse.json({ error: 'Хэрэглэгч олдсонгүй' }, { status: 404 });
        }

        // Re-issue JWT with unified payload via signAuthJwt() — same shape as all other auth routes
        const token = await signAuthJwt({
            userId: updatedUser._id.toString(),
            email: updatedUser.email,
            name: updatedUser.name || 'Хэрэглэгч',
            provider: updatedUser.provider || 'local',
            phone: updatedUser.phone,
            role: updatedUser.role || 'user',
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: updatedUser._id.toString(),
                phone: updatedUser.phone,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status,
                name: updatedUser.name,
                image: updatedUser.image,
            },
        });

        // Use the shared cookie helper — consistent 7d maxAge, httpOnly, secure, sameSite
        setAuthCookie(response, token);

        return response;
    } catch (error) {
        console.error('Complete profile error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
