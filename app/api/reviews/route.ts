import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth, currentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const reviewsCollection = await getCollection('reviews');
    const reviews = await reviewsCollection.find({ productId: new ObjectId(productId) }).sort({ createdAt: -1 }).toArray();

    // Check if current user has purchased this product
    let hasPurchased = false;
    const session = await auth();
    
    if (session?.userId) {
      const ordersCollection = await getCollection('orders');
      const order = await ordersCollection.findOne({
        userId: session.userId,
        status: { $in: ['delivered', 'shipped', 'confirmed', 'pending'] }, // Any valid order status
        $or: [
          { 'items.id': productId },
          { 'items._id': productId },
          { 'items.productId': productId }
        ]
      });
      hasPurchased = !!order;
    }

    return NextResponse.json({ reviews, hasPurchased });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, rating, comment, userName } = body;

    if (!productId || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Double check purchase on server side before saving review
    const ordersCollection = await getCollection('orders');
    const order = await ordersCollection.findOne({
      userId: user.id,
      status: { $in: ['delivered', 'shipped', 'confirmed', 'pending'] },
      $or: [
        { 'items.id': productId },
        { 'items._id': productId },
        { 'items.productId': productId }
      ]
    });

    if (!order) {
      return NextResponse.json({ error: 'Зөвхөн худалдан авсан хэрэглэгчид үнэлгээ бичих боломжтой.' }, { status: 403 });
    }

    const reviewsCollection = await getCollection('reviews');
    const newReview = {
      productId: new ObjectId(productId),
      userId: user.id,
      userName: userName || user.name || 'Anonymous',
      rating: Number(rating),
      comment,
      likes: 0,
      dislikes: 0,
      createdAt: new Date(),
    };

    const result = await reviewsCollection.insertOne(newReview);
    
    return NextResponse.json({ ...newReview, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid review ID is required' }, { status: 400 });
    }

    const reviewsCollection = await getCollection('reviews');
    const review = await reviewsCollection.findOne({ _id: new ObjectId(id) });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Allow deletion only if owner or admin
    if (review.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await reviewsCollection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
