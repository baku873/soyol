import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { sendOrderStatusUpdate } from '@/lib/email';
import { deductInventory } from '@/lib/inventory';

// Get all orders (Admin only)
export async function GET(request: Request) {
    try {
        const { userId: authUserId, role } = await auth();
        if (!authUserId || role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('userId');

        const ordersCollection = await getCollection('orders');

        let query: any = {
            $nor: [
                { status: 'pending', paymentMethod: 'qpay' }
            ]
        };
        if (targetUserId) {
            query.userId = targetUserId;
        }

        const orders = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();
        
        // Populate missing product details (Legacy support)
        const productIds = new Set<string>();
        orders.forEach(order => {
            order.items?.forEach((item: any) => {
                if (item.productId && (!item.name || !item.image || item.name === '' || item.image === '')) {
                    productIds.add(item.productId);
                }
            });
        });

        if (productIds.size > 0) {
            const productsCollection = await getCollection('products');
            const validObjectIds = Array.from(productIds)
                .map(id => {
                    try { return new ObjectId(id); } catch { return null; }
                })
                .filter((id): id is ObjectId => id !== null);

            const products = await productsCollection.find({
                _id: { $in: validObjectIds }
            }).toArray();

            const productMap = new Map(products.map(p => [p._id.toString(), p]));

            orders.forEach(order => {
                order.items?.forEach((item: any) => {
                    if (item.productId && (!item.name || !item.image || item.name === '' || item.image === '')) {
                        const product = productMap.get(item.productId.toString());
                        if (product) {
                            if (!item.name || item.name === '') item.name = product.name;
                            if (!item.image || item.image === '') item.image = product.images?.[0] || product.image;
                            if (!item.price && product.price) item.price = product.price;
                        }
                    }
                });
            });
        }

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Update order (Status, Delivery Estimate)
export async function PUT(request: Request) {
    try {
        const { userId, role } = await auth();
        if (!userId || role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { orderId, status, deliveryEstimate } = await request.json();

        if (status) {
            const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!allowedStatuses.includes(status)) {
                return NextResponse.json({ error: 'Буруу статус' }, { status: 400 });
            }
        }

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        const ordersCollection = await getCollection('orders');
        const existingOrder = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (!existingOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (deliveryEstimate !== undefined) updateData.deliveryEstimate = deliveryEstimate;

        const result = await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            { $set: updateData }
        );

        // Deduct inventory if transitioning from pending to a confirmed state
        if (status && status !== 'pending' && status !== 'cancelled' && existingOrder.status === 'pending') {
            if (existingOrder.items && existingOrder.items.length > 0) {
                await deductInventory(orderId, existingOrder.items);
            }
        }

        // Send notification to customer (Non-blocking)
        if (existingOrder.userId && status) {
            try {
                let title = '';
                let message = '';

                if (status === 'confirmed') {
                    title = '✅ Захиалга баталгаажлаа!';
                    message = `Таны захиалга баталгаажлаа. Хүргэлт: ${deliveryEstimate || existingOrder.deliveryEstimate || 'Тодорхойлогдоно'}`;
                } else if (status === 'delivered') {
                    title = '🚚 Захиалга хүргэгдлээ!';
                    message = 'Таны захиалга амжилттай хүргэгдлээ. Баярлалаа!';
                }

                if (title && message) {
                    const notificationsCollection = await getCollection('notifications');
                    await notificationsCollection.insertOne({
                        userId: existingOrder.userId,
                        title,
                        message,
                        type: 'order',
                        isRead: false,
                        link: '/orders',
                        createdAt: new Date()
                    });
                }
                // Send Email (Non-blocking)
                (async () => {
                    try {
                        const usersCollection = await getCollection('users');
                        const owner = await usersCollection.findOne({ _id: new ObjectId(existingOrder.userId) });
                        if (owner?.email) {
                            await sendOrderStatusUpdate(
                                { ...existingOrder, deliveryEstimate: deliveryEstimate || existingOrder.deliveryEstimate },
                                owner.email,
                                status
                            );
                        }
                    } catch (e) { console.error('Status update email error:', e); }
                })();
            } catch (notifError) {
                console.error('Failed to send customer notification:', notifError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
