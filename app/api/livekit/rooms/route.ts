/**
 * LiveKit Rooms API — Lists all active "unit" rooms
 * GET /api/livekit/rooms
 * Returns rooms prefixed with "room-" along with participant counts.
 */

import { RoomServiceClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit rooms: missing env vars');
      return NextResponse.json(
        { error: 'Server misconfigured — missing LiveKit credentials' },
        { status: 500 }
      );
    }

    // Convert wss:// to https:// for the REST API
    const httpUrl = livekitUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    const allRooms = await roomService.listRooms();

    // Filter to only "room-*" rooms (unit rooms)
    const unitRooms = allRooms
      .filter((r) => r.name?.startsWith('room-'))
      .map((r) => ({
        name: r.name,
        unitId: r.name?.replace(/^room-/, '') ?? '',
        numParticipants: r.numParticipants ?? 0,
        creationTime: Number(r.creationTime ?? 0),
      }));

    return NextResponse.json({ rooms: unitRooms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('LiveKit listRooms error:', message);
    return NextResponse.json(
      { error: 'Failed to list rooms' },
      { status: 500 }
    );
  }
}
