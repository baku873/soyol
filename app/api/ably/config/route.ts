import { NextResponse } from 'next/server';

/**
 * Returns whether Ably is configured server-side.
 * Client hooks use this to avoid calling /api/ably/auth when ABLY_KEY is missing
 * (prevents repeated 500s in dev logs).
 */
export async function GET() {
  const enabled = Boolean(process.env.ABLY_KEY?.trim());
  return NextResponse.json({ enabled });
}
