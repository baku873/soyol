/**
 * LiveKit Token API Route
 * POST endpoint for generating LiveKit access tokens with proper grants.
 * Supports token refresh via 'refresh' query parameter.
 */

import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

const TOKEN_TTL_SECONDS = 3600; // 1 hour
const TOKEN_TTL = `${TOKEN_TTL_SECONDS}s`;

interface TokenRequestBody {
  roomName: string;
  identity: string;
  displayName?: string;
}

function validateEnv(): string | null {
  if (!LIVEKIT_API_KEY) return 'LIVEKIT_API_KEY is not configured';
  if (!LIVEKIT_API_SECRET) return 'LIVEKIT_API_SECRET is not configured';
  if (!LIVEKIT_WS_URL) return 'NEXT_PUBLIC_LIVEKIT_URL is not configured';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const envError = validateEnv();
    if (envError) {
      console.error('LiveKit Config Error:', envError);
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as TokenRequestBody;
    const { roomName, identity, displayName } = body;

    if (!roomName || typeof roomName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "roomName"' },
        { status: 400 }
      );
    }

    if (!identity || typeof identity !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "identity"' },
        { status: 400 }
      );
    }

    // Sanitize room name
    const sanitizedRoom = roomName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!sanitizedRoom) {
      return NextResponse.json(
        { error: 'Invalid room name after sanitization' },
        { status: 400 }
      );
    }

    const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: identity.trim(),
      name: displayName?.trim() || identity.trim(),
      ttl: TOKEN_TTL,
    });

    at.addGrant({
      roomJoin: true,
      room: sanitizedRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true, // Required for DataChannel chat
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      roomName: sanitizedRoom,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('LiveKit Token Error:', message);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for backwards compatibility with existing VideoCall component.
 */
export async function GET(request: NextRequest) {
  try {
    const envError = validateEnv();
    if (envError) {
      console.error('LiveKit Config Error:', envError);
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const username = searchParams.get('username') || `user_${Math.floor(Math.random() * 10000)}`;

    if (!room) {
      return NextResponse.json(
        { error: 'Missing "room" query parameter' },
        { status: 400 }
      );
    }

    const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: username,
      name: username,
      ttl: TOKEN_TTL,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('LiveKit Token Error:', message);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
