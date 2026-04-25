import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get("phone");

    // Guest phone-based tracking — no auth required
    if (phoneParam) {
      const orders = await getCollection("orders");
      const results = await orders
        .find({ phone: phoneParam })
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json({ orders: results });
    }

    const { userId, phone } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const orders = await getCollection("orders");

    // Find orders by userId OR by matching phone number (catches pre-registration guest orders)
    const query = phone
      ? { $or: [{ userId }, { phone, userId: "guest" }] }
      : { userId };

    const results = await orders
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ orders: results });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const items = Array.isArray((body as any).items) ? (body as any).items : null;
    const phone = typeof (body as any).phone === "string" ? (body as any).phone.trim() : "";
    const fullName = typeof (body as any).fullName === "string" ? (body as any).fullName.trim() : "";

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Missing items" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "Missing phone" }, { status: 400 });
    }

    const { userId } = await auth();

    const orders = await getCollection("orders");
    const now = new Date();

    const doc = {
      ...body,
      userId: userId || "guest",
      phone,
      fullName,
      status: (body as any).status || "pending",
      createdAt: now,
      updatedAt: now,
    };

    const result = await orders.insertOne(doc);
    return NextResponse.json({ success: true, orderId: result.insertedId.toString() });
  } catch (error: any) {
    console.error("[Orders POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create order" },
      { status: 500 },
    );
  }
}
