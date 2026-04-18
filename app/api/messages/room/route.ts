/**
 * Room Chat Messages API
 * Handles in-call chat messages scoped to a specific room.
 * GET: Fetch messages for a room
 * POST: Store a new message for a room
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

interface RoomMessageDoc {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  timestamp: number;
  roomId: string;
  createdAt: Date;
}

/**
 * GET /api/messages/room?roomId=xxx
 * Returns all messages for a given room, sorted by timestamp.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing roomId parameter' },
        { status: 400 }
      );
    }

    const collection = await getCollection<RoomMessageDoc>('room_messages');

    const messages = await collection
      .find({ roomId })
      .sort({ timestamp: 1 })
      .limit(200)
      .toArray();

    const result = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      body: msg.body,
      timestamp: msg.timestamp,
      roomId: msg.roomId,
    }));

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Room Messages GET Error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/room
 * Stores a new chat message for a room.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, senderId, senderName, body: messageBody, timestamp, roomId } = body as {
      id: string;
      senderId: string;
      senderName: string;
      body: string;
      timestamp: number;
      roomId: string;
    };

    if (!id || !senderId || !senderName || !messageBody || !timestamp || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const collection = await getCollection<RoomMessageDoc>('room_messages');

    const doc: RoomMessageDoc = {
      id,
      senderId,
      senderName,
      body: messageBody,
      timestamp,
      roomId,
      createdAt: new Date(),
    };

    await collection.insertOne(doc);

    return NextResponse.json({ success: true, message: doc });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Room Messages POST Error:', message);
    return NextResponse.json(
      { error: 'Failed to store message' },
      { status: 500 }
    );
  }
}
