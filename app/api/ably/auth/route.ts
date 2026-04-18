/**
 * Ably Token Auth Endpoint
 * Issues Ably TokenRequests for client-side authentication.
 */

import { NextResponse } from 'next/server';
import Ably from 'ably';

const ABLY_API_KEY = process.env.ABLY_KEY;

export async function GET() {
  try {
    if (!ABLY_API_KEY) {
      console.error('ABLY_KEY not configured');
      return NextResponse.json(
        { error: 'Ably not configured' },
        { status: 500 }
      );
    }

    const client = new Ably.Rest(ABLY_API_KEY);

    const tokenRequestData = await client.auth.createTokenRequest({
      capability: { '*': ['subscribe', 'publish', 'presence'] },
      ttl: 3600000, // 1 hour in milliseconds
    });

    return NextResponse.json(tokenRequestData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Ably Auth Error:', message);
    return NextResponse.json(
      { error: 'Failed to generate Ably token' },
      { status: 500 }
    );
  }
}
