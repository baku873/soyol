import { NextRequest, NextResponse } from "next/server";

import { ObjectId } from "mongodb";

import { CANCELLABLE_STATUSES } from "@/types/Order";

import { auth } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, phone } = await auth();
    const resolvedParams = await params;

    if (!userId && !phone) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const orders = await getCollection("orders");
    
    let objectId;
    try {
      objectId = new ObjectId(resolvedParams.id);
    } catch {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await orders.findOne({ _id: objectId });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Allow access if user is owner, or if phone matches for guest orders
    const isOwner = order.userId === userId || order.phone === phone;
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Missing status field" }, { status: 400 });
    }

    // Only allow cancellation via this endpoint for now
    if (status !== "cancelled") {
      return NextResponse.json(
        { error: "Invalid status update via this endpoint" },
        { status: 400 }
      );
    }

    const orders = await getCollection("orders");
    let objectId;
    try {
      objectId = new ObjectId(resolvedParams.id);
    } catch {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await orders.findOne({ _id: objectId });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      const messages: Record<string, string> = {
        cancelled: "Энэ захиалга аль хэдийн цуцлагдсан байна",
        shipped: "Хүргэлтэнд гарсан захиалгыг цуцлах боломжгүй",
        delivered: "Хүргэгдсэн захиалгыг цуцлах боломжгүй",
      };
      return NextResponse.json(
        { error: messages[order.status] || "Энэ захиалгыг цуцлах боломжгүй" },
        { status: 400 }
      );
    }

    const { clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const db = client.db();
        const ordersCollection = db.collection("orders");
        const productsCollection = db.collection("products");

        // 1. Update order status
        await ordersCollection.updateOne(
          { _id: objectId },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // 2. Restore inventory
        if (order.items && order.items.length > 0) {
          for (const item of order.items) {
            const qty = item.quantity || 1;
            const prodId = item.productId || item.id;
            if (!prodId) continue;
            
            if (item.variantId) {
              await productsCollection.updateOne(
                { _id: new ObjectId(prodId), "variants.id": item.variantId },
                { $inc: { "variants.$.inventory": qty } },
                { session }
              );
            } else {
              // Only restore stock for in-stock items, pre-order might not have inventory
              await productsCollection.updateOne(
                { _id: new ObjectId(prodId), stockStatus: "in-stock" },
                { $inc: { inventory: qty } },
                { session }
              );
            }
          }
        }
      });
    } finally {
      await session.endSession();
    }

    // Notifications (non-blocking)
    try {
      const notificationsCollection = await getCollection("notifications");
      await notificationsCollection.insertOne({
        userId: order.userId,
        title: "❌ Захиалга цуцлагдлаа",
        message: "Таны захиалга амжилттай цуцлагдлаа.",
        type: "order",
        isRead: false,
        link: "/orders",
        createdAt: new Date(),
      });

      if (order.userId !== "guest") {
        const { sendPushToUser } = await import("@/lib/fcm");
        sendPushToUser({
          userId: order.userId,
          title: "❌ Захиалга цуцлагдлаа",
          body: "Таны захиалга амжилттай цуцлагдлаа.",
          data: { url: "/orders" },
        }).catch((err: unknown) =>
          console.error("FCM cancel push error:", err)
        );
      }
    } catch (error) {
      console.error("Failed to send cancellation notification:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order patch error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
