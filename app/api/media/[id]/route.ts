import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  // This is a simple fallback - in production, media would be served from Cloudinary directly
  return NextResponse.json({ message: 'Media route' });
}