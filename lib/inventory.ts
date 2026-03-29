import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';

export async function deductInventory(orderId: string, items: any[]) {
    if (!items || items.length === 0) return;

    try {
        const orders = await getCollection('orders');
        const order = await orders.findOne({ _id: new ObjectId(orderId) });
        
        // Prevent double deduction
        if (order?.inventoryDeducted) {
            console.log(`[Inventory] Order ${orderId} already had inventory deducted. Skipping.`);
            return;
        }

        const products = await getCollection('products');
        
        for (const item of items) {
            const productId = item.productId || item.id;
            if (!productId) continue;

            let objectId: ObjectId;
            try {
                objectId = new ObjectId(productId);
            } catch {
                continue;
            }

            // Decrement the inventory
            await products.updateOne(
                { _id: objectId },
                { $inc: { inventory: -(item.quantity || 1) } }
            );

            // Check if out of stock
            const updatedProduct = await products.findOne({ _id: objectId });
            if (updatedProduct && (updatedProduct.inventory ?? 0) <= 0) {
                await products.updateOne(
                    { _id: objectId },
                    { $set: { stockStatus: 'out-of-stock', inventory: 0 } }
                );
                console.log(`[Inventory] Product ${productId} marked out-of-stock — inventory reached 0`);
            }
        }

        // Mark order to indicate inventory has been deducted
        await orders.updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { inventoryDeducted: true } }
        );
        
        console.log(`[Inventory] Successfully deducted inventory for Order ${orderId}`);
    } catch (error) {
        console.error(`[Inventory] Failed to deduct inventory for order ${orderId}:`, error);
    }
}
