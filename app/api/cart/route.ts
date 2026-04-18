import { NextRequest, NextResponse } from "next/server";

import { ObjectId } from "mongodb";

import { auth } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

// GET /api/cart - Fetch user's cart
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ items: [] });

        const carts = await getCollection('carts');
        const cart = await carts.findOne({ userId });

        return NextResponse.json({ items: cart?.items || [] });
    } catch (error) {
        console.error('[Cart API GET] Error:', error);
        return NextResponse.json({ items: [] }, { status: 500 });
    }
}

// POST /api/cart - Update cart (add, update quantity)
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

        const { items } = await req.json();
        const carts = await getCollection('carts');

        await carts.updateOne(
            { userId },
            {
                $set: {
                    items,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Cart API POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/cart - Clear cart
export async function DELETE() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

        const carts = await getCollection('carts');
        await carts.deleteOne({ userId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Cart API DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
