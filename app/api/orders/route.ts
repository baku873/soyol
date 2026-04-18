import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

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
