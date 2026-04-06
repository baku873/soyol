'use server';

import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  sections?: string[];
  image: string;
  images?: string[];
  category: string;
  subcategory?: string;
  stockStatus: string;
  inventory: number;
  salesCount?: number;
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  brand?: string;
  model?: string;
  delivery?: string;
  deliveryFee?: number;
  paymentMethods?: string;
  attributes?: Record<string, string>;
  options?: { id: string; name: string; values: string[] }[];
  variants?: {
    id: string;
    options: Record<string, string>;
    inventory: number;
    price?: number;
    image?: string;
  }[];
  featured?: boolean;
  isCargo?: boolean;
};

export async function createProduct(data: ProductFormData) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return { success: false, error: 'Зөвшөөрөлгүй' };
    }

    const products = await getCollection('products');
    
    // Create a clean data object
    const productData: any = { ...data };
    
    // Ensure numeric types
    productData.inventory = Number(productData.inventory) || 0;
    productData.price = Number(productData.price) || 0;
    if (productData.originalPrice !== undefined) productData.originalPrice = Number(productData.originalPrice) || 0;
    if (productData.discountPercent !== undefined) productData.discountPercent = Number(productData.discountPercent) || 0;
    if (productData.salesCount !== undefined) productData.salesCount = Number(productData.salesCount) || 0;
    if (productData.deliveryFee !== undefined) productData.deliveryFee = Number(productData.deliveryFee) || 0;

    const result = await products.insertOne({
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/ready-to-ship');
    revalidatePath('/pre-order');
    revalidatePath('/admin/products');

    return { success: true, productId: result.insertedId.toString() };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create product' };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return { success: false, error: 'Зөвшөөрөлгүй' };
    }

    const products = await getCollection('products');
    await products.deleteOne({ _id: new ObjectId(productId) });

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/ready-to-ship');
    revalidatePath('/pre-order');
    revalidatePath('/admin/products');

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

export async function getAllProducts() {
  try {
    const products = await getCollection('products');
    const results = await products.find({}).sort({ createdAt: -1 }).toArray();
    return JSON.parse(JSON.stringify(results));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function updateProduct(productId: string, data: Partial<ProductFormData>) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return { success: false, error: 'Зөвшөөрөлгүй' };
    }

    const products = await getCollection('products');

    // Create a clean update object with only provided fields
    const updateData: any = { ...data };
    
    // Ensure numeric types
    if (updateData.inventory !== undefined) updateData.inventory = Number(updateData.inventory) || 0;
    if (updateData.price !== undefined) updateData.price = Number(updateData.price) || 0;
    if (updateData.originalPrice !== undefined) updateData.originalPrice = Number(updateData.originalPrice) || 0;
    if (updateData.discountPercent !== undefined) updateData.discountPercent = Number(updateData.discountPercent) || 0;
    if (updateData.salesCount !== undefined) updateData.salesCount = Number(updateData.salesCount) || 0;
    if (updateData.deliveryFee !== undefined) updateData.deliveryFee = Number(updateData.deliveryFee) || 0;

    // Remove _id if it accidentally exists in data
    delete updateData._id;

    await products.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/ready-to-ship');
    revalidatePath('/pre-order');
    revalidatePath(`/product/${productId}`);
    revalidatePath('/admin/products');

    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: 'Failed to update product' };
  }
}
