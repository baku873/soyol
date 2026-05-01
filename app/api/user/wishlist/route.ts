import { NextRequest, NextResponse } from 'next/server'; 
 import { getCollection } from '@/lib/mongodb'; 
 import { auth } from '@/lib/auth'; 
 import { ObjectId } from 'mongodb'; 
 
 // GET — productId param: check single item; no param: return full wishlist with product data
 export async function GET(req: NextRequest) { 
   try { 
     const { userId } = await auth(); 
     if (!userId) return NextResponse.json({ isWishlisted: false, items: [] }); 
 
     const { searchParams } = new URL(req.url); 
     const productId = searchParams.get('productId'); 

     const users = await getCollection('users'); 
     const user = await users.findOne({ _id: new ObjectId(userId) }); 
     const wishlistIds: string[] = user?.wishlist || [];

     // Single-product check mode
     if (productId) {
       return NextResponse.json({ isWishlisted: wishlistIds.includes(productId) }); 
     }

     // Full wishlist mode — return product objects
     if (wishlistIds.length === 0) {
       return NextResponse.json({ items: [] });
     }

     const products = await getCollection('products');
     const objectIds = wishlistIds
       .filter((id) => ObjectId.isValid(id))
       .map((id) => new ObjectId(id));

     const productDocs = await products
       .find({ _id: { $in: objectIds } })
       .project({ password: 0 })
       .toArray();

     const items = productDocs.map((p) => ({
       ...p,
       id: p._id.toString(),
       _id: undefined,
     }));

     return NextResponse.json({ items });
   } catch { 
     return NextResponse.json({ isWishlisted: false, items: [] }); 
   } 
 } 
 
 // POST — wishlist-д нэмэх 
 export async function POST(req: NextRequest) { 
   try { 
     const { userId } = await auth(); 
     if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); 
 
     const { productId } = await req.json(); 
     if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 }); 
 
     const users = await getCollection('users'); 
     await users.updateOne( 
       { _id: new ObjectId(userId) }, 
       { $addToSet: { wishlist: productId } } 
     ); 
 
     return NextResponse.json({ success: true }); 
   } catch { 
     return NextResponse.json({ error: 'Failed' }, { status: 500 }); 
   } 
 } 
 
 // DELETE — wishlist-аас хасах 
 export async function DELETE(req: NextRequest) { 
   try { 
     const { userId } = await auth(); 
     if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); 
 
     const { productId } = await req.json(); 
     if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 }); 
 
     const users = await getCollection('users'); 
     await users.updateOne( 
       { _id: new ObjectId(userId) }, 
       { $pull: { wishlist: productId } } 
     ); 
 
     return NextResponse.json({ success: true }); 
   } catch { 
     return NextResponse.json({ error: 'Failed' }, { status: 500 }); 
   } 
 }