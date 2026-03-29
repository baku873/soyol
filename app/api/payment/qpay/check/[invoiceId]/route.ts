import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkPayment } from '@/lib/qpay';
import { ObjectId } from 'mongodb';
import { deductInventory } from '@/lib/inventory';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const { invoiceId } = await params;

        if (!invoiceId) {
            return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
        }

        // 1. Check QPay Status
        const paymentStatus = await checkPayment(invoiceId);

        if (paymentStatus.paid) {
            // 2. Update Order Status
            const ordersCollection = await getCollection('orders');
            const order = await ordersCollection.findOne({ qpayInvoiceId: invoiceId });

            if (order && order.status === 'pending') {
                await ordersCollection.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            status: 'confirmed',
                            paidAt: paymentStatus.paidAt,
                            updatedAt: new Date()
                        }
                    }
                );

                // Deduct inventory since order is now confirmed
                if (order.items && order.items.length > 0) {
                    await deductInventory(order._id.toString(), order.items);
                }

                // Notify Admin
                try {
                    const { notifyAdminNewOrder } = await import('@/lib/adminNotifications');
                    await notifyAdminNewOrder(
                        order._id.toString(), 
                        order.shipping?.fullName || 'Хэрэглэгч', 
                        order.total || order.totalPrice || 0
                    );
                } catch (e) {
                    console.error('[QPay Check] Failed to notify admin:', e);
                }

                // Notify Customer (Non-blocking)
                try {
                    const notificationsCollection = await getCollection('notifications');
                    await notificationsCollection.insertOne({
                        userId: order.userId,
                        title: '✅ Төлбөр баталгаажлаа',
                        message: `Таны #${order._id.toString().slice(-6)} захиалгын төлбөр амжилттай хийгдлээ.`,
                        type: 'order',
                        isRead: false,
                        link: `/orders/${order._id}`,
                        createdAt: new Date()
                    });
                } catch (e) { console.error('Notify error', e); }
            }
        }

        return NextResponse.json(paymentStatus);
    } catch (error: any) {
        console.error('[QPay Check API] Error:', error);
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }
}
