import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { verifyOtp } from '@/lib/twilio';
import { signAuthJwt } from '@/lib/jwt';
import { setAuthCookie } from '@/lib/authCookies';

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Missing phone or code' }, { status: 400 });
    }

    // 2. Verify OTP (Twilio or Mock)
    const twilioRes = await verifyOtp(phone, code);
    let isVerified = false;

    if (twilioRes.success) {
      if (twilioRes.isValid) {
        isVerified = true;
      } else {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }
    } else if (twilioRes.error?.includes('Mock')) {
      // Fallback to DB check for Mock mode
      const otpCollection = await getCollection('otps');
      const otpRecord = await otpCollection.findOne({ phone, code });

      if (!otpRecord) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }

      if (new Date() > otpRecord.expiresAt) {
        return NextResponse.json({ error: 'Code expired' }, { status: 400 });
      }

      // Mark verified
      await otpCollection.deleteOne({ _id: otpRecord._id });
      isVerified = true;
    } else {
      // Twilio API Error
      console.error('Twilio Error:', twilioRes.error);
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Check or Create User
    const usersCollection = await getCollection('users');
    let user = await usersCollection.findOne({ phone });

    if (!user) {
      // Default role: user, Status: available
      const newUser = {
        phone,
        role: 'user',
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const res = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: res.insertedId };
    }

    // Generate JWT via unified signAuthJwt() — same shape as all other auth routes
    const token = await signAuthJwt({
      userId: user._id.toString(),
      name: user.name || 'Хэрэглэгч',
      provider: user.provider || 'local',
      email: user.email,
      phone: user.phone,
      role: user.role || 'user',
    });

    // Set cookie via shared helper — consistent 7d maxAge
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        role: user.role,
        status: user.status,
        name: user.name,
        image: user.image
      }
    });

    setAuthCookie(response, token);
    return response;

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
