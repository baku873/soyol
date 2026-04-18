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

        // Send notification to customer via dispatcher (Non-blocking)
        if (existingOrder.userId && existingOrder.userId !== 'guest' && status) {
            setImmediate(() => {
                import('@/services/notification.dispatcher').then(({ dispatchToUser }) => {
                    const shortId = orderId.slice(-6).toUpperCase();
                    const userId = existingOrder.userId;
                    
                    const orderData = {
                        id: orderId,
                        fullName: existingOrder.shipping?.fullName || 'Хэрэглэгч',
                        items: existingOrder.items || [],
                        subtotal: existingOrder.totalPrice,
                        shippingCost: 0,
                        total: existingOrder.totalPrice,
                        address: existingOrder.shipping?.address || '',
                        city: existingOrder.shipping?.city || '',
                        estimatedDelivery: deliveryEstimate || existingOrder.deliveryEstimate,
                        refundAmount: existingOrder.totalPrice
                    };

                    if (status === 'confirmed') {
                        dispatchToUser(userId, {
                            type: 'order_confirmed',
                            title: '✅ Захиалга батлагдлаа!',
                            body: `Таны #${shortId} захиалга батлагдлаа. Хүргэлт: ${orderData.estimatedDelivery || 'Тодорхойлогдоно'}`,
                            data: { orderId, url: `/orders` }
                        }).catch(console.error);
                    } else if (status === 'shipped') {
                        dispatchToUser(userId, {
                            type: 'order_shipped',
                            priority: 'high',
                            title: '🚚 Захиалга хүргэлтэнд гарлаа!',
                            body: `Таны #${shortId} захиалга хүргэлтэнд гарлаа.`,
                            data: { orderId, url: `/orders` },
                            orderData: {
                                order: orderData,
                                tracking: {
                                    trackingNumber: existingOrder.trackingNumber || 'Бүртгэгдээгүй',
                                    carrierName: existingOrder.carrierName || 'Soyol Хүргэлт',
                                    estimatedDelivery: orderData.estimatedDelivery
                                }
                            }
                        }).catch(console.error);
                    } else if (status === 'delivered') {
                        dispatchToUser(userId, {
                            type: 'order_delivered',
                            priority: 'high',
                            title: '🎉 Захиалга хүргэгдлээ!',
                            body: `Таны #${shortId} захиалга амжилттай хүргэгдлээ.`,
                            data: { orderId, url: `/orders` },
                            orderData
                        }).catch(console.error);
                    } else if (status === 'cancelled') {
                        dispatchToUser(userId, {
                            type: 'order_cancelled',
                            title: '❌ Захиалга цуцлагдлаа',
                            body: `Таны #${shortId} захиалга цуцлагдлаа.`,
                            data: { orderId, url: `/orders` },
                            orderData: {
                                id: orderId,
                                fullName: orderData.fullName,
                                refundAmount: orderData.refundAmount,
                                reason: existingOrder.cancelReason || 'Удирдах ажилтан цуцалсан'
                            }
                        }).catch(console.error);
                    }
                }).catch(console.error);
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
