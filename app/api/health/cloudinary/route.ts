import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET() {
  try {
    // Check legacy cloud (dohh4grkj)
    const legacyCloud = await cloudinary.api.ping({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_LEGACY_CLOUD_NAME || 'dohh4grkj',
    });

    // Check new cloud (deaycxpgh)
    const newCloud = await cloudinary.api.ping({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'deaycxpgh',
    });

    return NextResponse.json({
      legacy: { ok: true, ...legacyCloud },
      new: { ok: true, ...newCloud },
    });
  } catch (error) {
    console.error('Cloudinary health check failed:', error);
    return NextResponse.json(
      { error: 'Cloudinary health check failed', details: error },
      { status: 500 }
    );
  }
}