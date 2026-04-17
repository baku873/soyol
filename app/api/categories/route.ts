import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export const revalidate = 300;

export async function GET() {
  try {
    const categoriesCollection = await getCollection('categories');
    const productsCollection = await getCollection('products');

    // Get total products count
    const totalProducts = await productsCollection.countDocuments();

    // Aggregation to get categories with product count
    const categories = await categoriesCollection.aggregate([
      {
        $lookup: {
          from: 'products',
          // Assuming 'id' field in categories matches 'category' field in products
          // We use 'id' because that's what we use in our mock data and frontend
          localField: 'id',
          foreignField: 'category',
          as: 'categoryProducts'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$categoryProducts' }
        }
      },
      {
        $project: {
          categoryProducts: 0 // Remove the heavy products array
        }
      }
    ]).toArray();

    const seenIds = new Set<string>();
    const formattedCategories = categories
      .map((cat: any) => {
        const rawId = typeof cat.id === "string" ? cat.id.trim() : "";
        const id = rawId && rawId !== "-" ? rawId : cat._id?.toString?.() || "";
        return {
          ...cat,
          id,
          _id: cat._id?.toString?.() || id,
        };
      })
      .filter((cat: any) => {
        if (!cat.id || seenIds.has(cat.id)) return false;
        seenIds.add(cat.id);
        return true;
      });

    if (formattedCategories.length === 0) {
      // Fallback mock categories if DB is empty
      const mockCategories = [
        { id: 'electronics', name: 'Electronics', icon: 'laptop', subcategories: [], productCount: 0 },
        { id: 'fashion', name: 'Fashion', icon: 'shirt', subcategories: [], productCount: 0 },
        { id: 'home', name: 'Home', icon: 'home', subcategories: [], productCount: 0 },
        { id: 'beauty', name: 'Beauty', icon: 'sparkles', subcategories: [], productCount: 0 },
        { id: 'sports', name: 'Sports', icon: 'dumbbell', subcategories: [], productCount: 0 },
        { id: 'baby', name: 'Baby', icon: 'baby', subcategories: [], productCount: 0 },
        { id: 'watches', name: 'Watches', icon: 'watch', subcategories: [], productCount: 0 },
        { id: 'books', name: 'Books', icon: 'book', subcategories: [], productCount: 0 },
        { id: 'toys', name: 'Toys', icon: 'gamepad-2', subcategories: [], productCount: 0 },
      ];

      return NextResponse.json(
        {
          categories: mockCategories,
          totalProducts: 0
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    return NextResponse.json(
      {
        categories: formattedCategories,
        totalProducts
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    // Fallback mock on error
    const mockCategories = [
      { id: 'electronics', name: 'Electronics', icon: 'laptop', subcategories: [], productCount: 0 },
      { id: 'fashion', name: 'Fashion', icon: 'shirt', subcategories: [], productCount: 0 },
      { id: 'home', name: 'Home', icon: 'home', subcategories: [], productCount: 0 },
      { id: 'beauty', name: 'Beauty', icon: 'sparkles', subcategories: [], productCount: 0 },
    ];

    return NextResponse.json(
      {
        categories: mockCategories,
        totalProducts: 0
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, icon, subcategories } = body;

    if (!name || !icon) {
      return NextResponse.json({ error: 'Name and icon are required' }, { status: 400 });
    }

    const categoriesCollection = await getCollection('categories');

    // Generate simple slug/id from name if not provided
    // This is a simple implementation; robust one would handle duplicates
    const id = body.id || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const newCategory = {
      id,
      name,
      icon,
      subcategories: subcategories || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await categoriesCollection.insertOne(newCategory);

    return NextResponse.json({ success: true, category: { ...newCategory, _id: result.insertedId } });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
