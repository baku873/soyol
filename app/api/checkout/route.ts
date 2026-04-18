import { NextRequest, NextResponse } from "next/server";

import { ObjectId } from "mongodb";
import { z } from "zod";

import { User } from "@/types/User";

import { auth } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { sendOrderConfirmation } from "@/lib/email";
import { notifyAdminNewOrder } from "@/lib/adminNotifications";

const CheckoutSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1).max(99),
    variantId: z.string().optional(),
    selectedOptions: z.record(z.string(), z.string()).optional()
  })).min(1).max(20),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  address: z.string().min(5),
  city: z.string(),
  district: z.string(),
  notes: z.string().optional(),
  saveAddress: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  deliveryMethod: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();

    const validation = CheckoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }

    const { items, saveAddress, ...userDetails } = validation.data;
    const { clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const session = client.startSession();

    let orderId: string | null = null;
    let totalPrice = 0;
    const orderItems: any[] = [];
    let hasPreOrder = false;

    try {
      await session.withTransaction(async () => {
        const db = client.db();
        const productsCollection = db.collection("products");
        const ordersCollection = db.collection("orders");
        const storesCollection = db.collection("stores");

        const productIds = items.map(item => new ObjectId(item.id));
        const dbProducts = await productsCollection.find({ _id: { $in: productIds } }, { session }).toArray();

        for (const item of items) {
          const product = dbProducts.find((p: any) => p._id.toString() === item.id);
          if (!product) throw new Error(`Product not found: ${item.id}`);

          if (product.stockStatus === "pre-order") hasPreOrder = true;

          let availableStock = product.inventory || 0;
          let variant = null;

          if (item.variantId && product.variants?.length) {
            variant = product.variants.find((v: any) => v.id === item.variantId);
            if (variant) availableStock = variant.inventory;
          }

          if (product.stockStatus === "in-stock" && availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
          }

          const vendorId = product.vendorId;
          let commissionAmount = 0;
          let vendorAmount = product.price * item.quantity;

          if (vendorId) {
            const store = await storesCollection.findOne({ vendorId }, { session });
            const commissionRate = store?.commissionRate || 10;
            commissionAmount = (product.price * item.quantity) * (commissionRate / 100);
            vendorAmount = (product.price * item.quantity) - commissionAmount;
          }

          totalPrice += product.price * item.quantity;
          orderItems.push({
            id: item.id,
            productId: item.id,
            variantId: item.variantId || null,
            selectedOptions: item.selectedOptions || null,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            image: product.image || product.images?.[0] || "",
            vendorId: vendorId || null,
            commissionAmount,
            vendorAmount
          });
        }

        const deliveryEstimate = hasPreOrder ? "7-14 хоног" : "Өнөөдөр - Маргааш";

        const newOrder = {
          ...userDetails,
          userId: userId || "guest",
          phone: userDetails.phone, // Ensure phone is at top level for guest lookups
          shipping: {
            fullName: userDetails.fullName,
            phone: userDetails.phone,
            address: userDetails.address,
            city: userDetails.city,
            district: userDetails.district,
            notes: userDetails.notes
          },
          items: orderItems,
          totalPrice,
          total: totalPrice,
          status: "pending",
          hasPreOrder,
          deliveryEstimate,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await ordersCollection.insertOne(newOrder, { session });
        orderId = result.insertedId.toString();

        for (const item of items) {
          if (item.variantId) {
            await productsCollection.updateOne(
              { _id: new ObjectId(item.id), "variants.id": item.variantId },
              { $inc: { "variants.$.inventory": -item.quantity } },
              { session }
            );
          } else {
            await productsCollection.updateOne(
              { _id: new ObjectId(item.id), stockStatus: "in-stock" },
              { $inc: { inventory: -item.quantity } },
              { session }
            );
          }
        }

        // Clear cart
        if (userId && userId !== "guest") {
          const cartsCollection = db.collection("carts");
          await cartsCollection.deleteOne({ userId }, { session });
        }
      });
    } finally {
      await session.endSession();
    }

    if (!orderId) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Post-transaction operations (silent save, emails, notifications)
    try {
      if (userId && userId !== "guest" && saveAddress) {
        const users = await getCollection<User>("users");
        const userObjectId = new ObjectId(userId);

        const newAddress = {
          id: new ObjectId().toString(),
          city: userDetails.city || "",
          district: userDetails.district || "",
          label: "Гэр",
          khoroo: "",
          street: "",
          apartment: "",
          entrance: "",
          floor: "",
          door: "",
          note: userDetails.notes || "",
          isDefault: true,
        };

        await users.updateOne(
          { _id: userObjectId, "addresses.isDefault": true },
          { $set: { "addresses.$.isDefault": false } }
        );

        await users.updateOne(
          { _id: userObjectId },
          {
            $push: { addresses: newAddress } as any,
            $set: { phone: userDetails.phone }
          }
        );
      }

      // Admin Notification
      if (userDetails.paymentMethod !== "qpay") {
        notifyAdminNewOrder(orderId, userDetails.fullName || "Хэрэглэгч", totalPrice).catch(console.error);
      }

      // Email Confirmation
      const recipientEmail = (userId && userId !== "guest") ? (await getCollection("users").then(c => c.findOne({ _id: new ObjectId(userId) })))?.email : undefined;
      if (recipientEmail) {
        sendOrderConfirmation({
          id: orderId,
          items: orderItems,
          totalPrice,
          fullName: userDetails.fullName,
          address: userDetails.address,
          city: userDetails.city,
        }, recipientEmail).catch(console.error);
      }

    } catch (e) {
      console.error("Post-transaction hooks error:", e);
    }

    return NextResponse.json({
      success: true,
      orderId,
      message: "Order placed successfully"
    });

  } catch (error: any) {
    console.error("[Checkout API] Error:", error);
    return NextResponse.json({
      error: error.message?.includes("stock") || error.message?.includes("бараа")
        ? error.message
        : "Захиалга үүсгэхэд алдаа гарлаа"
    }, { status: 500 });
  }
}