import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import ProductDetailClient from '@/components/ProductDetailClient';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const products = await getCollection('products');
    const product = await products.findOne({ _id: new ObjectId(id) });
    if (!product) return {};
    return {
      title: product.isCargo ? `${product.name} + Карго` : product.name,
      description: product.description || product.name,
      openGraph: {
        title: product.isCargo ? `${product.name} + Карго` : product.name,
        description: product.description || product.name,
        images: product.images?.[0]
          ? [{ url: product.images[0] }]
          : product.image
            ? [{ url: product.image }]
            : [],
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const products = await getCollection('products');
    const product = await products.findOne({ _id: new ObjectId(id) });

    if (!product) {
      notFound();
    }

    const relatedProducts = await products
      .find({
        category: product.category,
        _id: { $ne: product._id }
      })
      .limit(4)
      .toArray();

    const mappedRelatedProducts = relatedProducts.map(p => ({
      id: p._id.toString(),
      name: p.name,
      image: p.image || '',
      price: p.price,
      rating: p.rating || 0,
      category: p.category,
      featured: p.featured,
      stockStatus: p.stockStatus,
      isCargo: p.isCargo || false,
      inventory: p.inventory
    }));

    const productData = {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      image: product.image || null,
      images: product.images || [],
      category: product.category,
      stockStatus: product.stockStatus || 'in-stock',
      inventory: product.inventory ?? 0,
      brand: product.brand || undefined,
      model: product.model || undefined,
      paymentMethods: product.paymentMethods || undefined,
      sections: product.sections || [],
      attributes: product.attributes || {},
      options: product.options || [],
      variants: product.variants || [],
      shippingOrigin: product.shippingOrigin || undefined,
      shippingDestination: product.shippingDestination || undefined,
      dispatchTime: product.dispatchTime || undefined,
      sizeGuideUrl: product.sizeGuideUrl || undefined,
      wholesale: product.wholesale || false,
      featured: product.featured || false,
      isCargo: product.isCargo || false,
      deliveryFee: product.deliveryFee ?? 0,
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
      rating: product.rating || 0,
      relatedProducts: mappedRelatedProducts,
    };

    return <ProductDetailClient product={productData} initialReviews={[]} />;
  } catch {
    notFound();
  }
}
