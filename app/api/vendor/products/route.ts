import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { sendPushToAllUsers } from '@/lib/fcm';

export async function GET(req: NextRequest) {
    try {
        const { userId, role } = await auth();
        if (!userId || role !== 'vendor') {
            return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
        }

        const productsCollection = await getCollection('products');
        const products = await productsCollection.find({ vendorId: userId }).sort({ createdAt: -1 }).toArray();

        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, role } = await auth();
        if (!userId || role !== 'vendor') {
            return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
        }

        const body = await req.json();
        const productsCollection = await getCollection('products');

        const newProduct = {
            ...body,
            vendorId: userId, // Ensure vendorId is fixed to current user
            inventory: Number(body.inventory) || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await productsCollection.insertOne(newProduct);

        // Dispatch notifications in background
        setImmediate(() => {
            import('@/services/notification.dispatcher').then(({ dispatchToAllUsers }) => {
                dispatchToAllUsers({
                    type: 'product_added',
                    title: '🆕 Шинэ бараа нэмэгдлээ!',
                    body: `${newProduct.name}${newProduct.price ? ` — ${newProduct.price}₮` : ''}`,
                    data: {
                        url: `/products/${result.insertedId.toString()}`,
                        productId: result.insertedId.toString()
                    },
                    productData: {
                        name: newProduct.name,
                        image: newProduct.image || newProduct.images?.[0],
                        price: newProduct.price,
                        productId: result.insertedId.toString()
                    }
                }).catch(console.error);
            });
        });

        return NextResponse.json({ success: true, productId: result.insertedId.toString() }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { userId, role } = await auth();
        if (!userId || role !== 'vendor') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const storesCollection = await getCollection('stores'); 
        const store = await storesCollection.findOne({ vendorId: userId }); 
        if (!store) { 
            return NextResponse.json({ error: 'Дэлгүүр олдсонгүй' }, { status: 404 }); 
        } 
        if (store.status !== 'active') { 
            return NextResponse.json({ error: 'Таны дэлгүүр идэвхжээгүй байна. Админ зөвшөөрөхийг хүлээнэ үү.' }, { status: 403 }); 
        }

        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

        const productsCollection = await getCollection('products');

        // Ensure product belongs to this vendor
        const existing = await productsCollection.findOne({ _id: new ObjectId(id), vendorId: userId });
        if (!existing) {
            return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
        }

        if (updateData.inventory !== undefined) {
            updateData.inventory = Number(updateData.inventory);
        }

        await productsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...updateData, updatedAt: new Date() } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { userId, role } = await auth();
        if (!userId || role !== 'vendor') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

        const productsCollection = await getCollection('products');

        // Ensure ownership
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id), vendorId: userId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
