import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { createInvoice } from "@/lib/qpay";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";

function getBaseUrl(req: NextRequest): string {
  const normalize = (url?: string | null) =>
    (url ?? "").trim().replace(/\/$/, "");

  const fromForwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const fromForwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const fromHost = req.headers.get("host")?.trim();
  const fromNextUrlHost = req.nextUrl.host?.trim();

  if (fromForwardedProto && fromForwardedHost) {
    return `${fromForwardedProto}://${fromForwardedHost}`.replace(/\/$/, "");
  }

  const envCandidates = [
    normalize(process.env.NEXT_PUBLIC_BASE_URL),
    normalize(process.env.NEXTAUTH_URL),
    process.env.VERCEL_URL
      ? `https://${normalize(process.env.VERCEL_URL)}`
      : "",
  ].filter(Boolean);

  const hostCandidate = fromHost || fromNextUrlHost || "";
  const isLocalHost =
    hostCandidate.startsWith("localhost") ||
    hostCandidate.startsWith("127.") ||
    hostCandidate.includes(".local");

  if (!isLocalHost && hostCandidate) {
    const proto = fromForwardedProto || "https";
    return `${proto}://${hostCandidate}`.replace(/\/$/, "");
  }

  return envCandidates[0] || "";
}

export async function POST(req: NextRequest) {
  try {
    // userId is null for guests — that is intentional and handled below
    const { userId } = await auth();

    const body = await req.json();
    const { orderId, amount, description } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "Missing orderId or amount" },
        { status: 400 },
      );
    }

    const ordersCollection = await getCollection("orders");
    const order = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Allow if the authenticated user owns the order, OR it is a guest order.
    // Guest orders are identified by userId === 'guest' and the orderId itself
    // acts as an unguessable token (MongoDB ObjectId) so no extra secret is needed.
    const orderUserId = (order as any)?.userId;
    const isOwner = !!userId && orderUserId === userId;
    // Treat missing/empty userId as guest orders to avoid blocking checkout flows that
    // were created before we standardized on `userId: "guest"`.
    const isGuestOrder = !orderUserId || orderUserId === "guest";

    if (!isOwner && !isGuestOrder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Create QPay Invoice
    const qpayData = await createInvoice({
      orderId,
      amount,
      description: description || `Order #${orderId}`,
      callbackBaseUrl: getBaseUrl(req),
    });

    // 2. Store invoiceId in order
    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { qpayInvoiceId: qpayData.invoiceId, updatedAt: new Date() } },
    );

    return NextResponse.json(qpayData);
  } catch (error: any) {
    console.error("[QPay Create API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Invoice creation failed" },
      { status: 500 },
    );
  }
}
