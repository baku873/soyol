import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Buddha';

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not set in .env file');
    process.exit(1);
}

const BROKEN_IMAGE_URL = 'https://images.unsplash.com/photo-1554941068-a252989d3652?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
const NEW_IMAGE_URL = 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

/**
 * Safely (re)create an index.
 *
 * Handles two conflict cases from Mongo:
 *   - code 85 (IndexOptionsConflict): same key, different options
 *   - code 86 (IndexKeySpecsConflict): same name, different key spec
 *
 * When conflict occurs we look up the EXISTING index by key pattern (because
 * the old index may have a different auto-generated name than the new one
 * we want), drop it by its real name, and recreate.
 */
async function safeCreateIndex(
    collection: ReturnType<MongoClient['db']>['collection'] extends (...args: any[]) => infer R ? R : never,
    keys: Record<string, any>,
    options: Record<string, any> = {},
) {
    const indexName: string | undefined = options.name;

    const tryCreate = async () => {
        await collection.createIndex(keys as any, options as any);
        console.log(`  ✓ ${indexName || JSON.stringify(keys)}`);
    };

    try {
        await tryCreate();
    } catch (err: any) {
        if (err?.code !== 85 && err?.code !== 86) throw err;

        // Find an existing index whose key pattern matches what we want to create.
        const existing = await collection.listIndexes().toArray();
        const sameKey = existing.find((i: any) =>
            JSON.stringify(i?.key) === JSON.stringify(keys),
        );
        const sameName =
            indexName && existing.find((i: any) => i?.name === indexName);

        const toDrop = sameKey ?? sameName;
        if (!toDrop?.name) {
            // Nothing to drop but Mongo reported conflict — rethrow the original.
            throw err;
        }

        await collection.dropIndex(toDrop.name);
        await tryCreate();
        console.log(`  ↻ replaced prior index: ${toDrop.name}`);
    }
}

async function fixDb() {
    // Note: `strict: false` is required — MongoDB's Stable API in strict mode
    // rejects text index creation. We still pin the API version for
    // deterministic behavior; just relax strictness for this admin script.
    const client = new MongoClient(MONGODB_URI!, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
        },
        tls: true,
        tlsAllowInvalidCertificates: true,
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(MONGO_DB);
        const products = db.collection('products');

        // ── Data fixes ────────────────────────────────────────────────────────
        const updateResult = await products.updateMany(
            { image: BROKEN_IMAGE_URL },
            { $set: { image: NEW_IMAGE_URL } },
        );
        console.log(`Updated ${updateResult.modifiedCount} products with broken images.`);

        // ── Products indexes ──────────────────────────────────────────────────
        console.log('\nCreating products indexes...');

        // 1. Weighted text index (Cyrillic-safe: default_language "none").
        //    Drop any pre-existing text index first because options differ.
        try {
            const existing = await products.listIndexes().toArray();
            const textIdx = existing.find((i: any) =>
                i?.name === 'products_text_search' ||
                Object.values(i?.key ?? {}).includes('text'),
            );
            if (textIdx?.name) {
                await products.dropIndex(textIdx.name);
                console.log(`  ✗ dropped stale text index: ${textIdx.name}`);
            }
        } catch {
            /* no-op */
        }

        await safeCreateIndex(
            products,
            { name: 'text', description: 'text', brand: 'text', category: 'text' },
            {
                weights: { name: 10, brand: 5, description: 3, category: 1 },
                default_language: 'none', // safe for Cyrillic / Mongolian
                name: 'products_text_search',
            },
        );

        // 2. Single-field indexes (support ad-hoc filters)
        await safeCreateIndex(products, { createdAt: -1 }, { name: 'products_createdAt_-1' });
        await safeCreateIndex(products, { category: 1 }, { name: 'products_category_1' });
        await safeCreateIndex(products, { stockStatus: 1 }, { name: 'products_stockStatus_1' });
        await safeCreateIndex(products, { price: 1 }, { name: 'products_price_1' });
        await safeCreateIndex(products, { vendorId: 1 }, { name: 'products_vendorId_1' });

        // 3. Sparse index on `featured` — most products have featured=false, so
        //    sparse keeps this small and fast.
        await safeCreateIndex(
            products,
            { featured: 1 },
            { name: 'products_featured_1', sparse: true },
        );

        // 4. Compound indexes (ESR order: Equality, Sort, Range) — tuned to
        //    the actual UI filter combinations on the home/product pages.
        await safeCreateIndex(
            products,
            { category: 1, stockStatus: 1 },
            { name: 'products_category_stockStatus' },
        );
        await safeCreateIndex(
            products,
            { category: 1, _id: -1 },
            { name: 'products_category_id_-1' },
        );
        await safeCreateIndex(
            products,
            { category: 1, price: 1 },
            { name: 'products_category_price' },
        );
        await safeCreateIndex(
            products,
            { featured: 1, _id: -1 },
            { name: 'products_featured_id_-1', sparse: true },
        );
        await safeCreateIndex(
            products,
            { sections: 1, _id: -1 },
            { name: 'products_sections_id_-1' },
        );
        await safeCreateIndex(
            products,
            { discountPercent: 1, _id: -1 },
            { name: 'products_discount_id_-1' },
        );

        // ── Orders indexes ────────────────────────────────────────────────────
        console.log('\nCreating orders indexes...');
        const orders = db.collection('orders');
        await safeCreateIndex(orders, { userId: 1, createdAt: -1 }, { name: 'orders_user_created' });
        await safeCreateIndex(orders, { status: 1, createdAt: -1 }, { name: 'orders_status_created' });
        await safeCreateIndex(orders, { phone: 1 }, { name: 'orders_phone' });
        await safeCreateIndex(orders, { 'items.vendorId': 1 }, { name: 'orders_items_vendorId' });

        // ── Users indexes ─────────────────────────────────────────────────────
        console.log('\nCreating users indexes...');
        const users = db.collection('users');
        // Partial unique index: enforce uniqueness only on users whose `phone`
        // is an actual non-empty string. Users signed up via OAuth/email may
        // have phone missing or null — those are allowed to coexist.
        await safeCreateIndex(
            users,
            { phone: 1 },
            {
                name: 'users_phone',
                unique: true,
                partialFilterExpression: { phone: { $type: 'string' } },
            },
        );
        await safeCreateIndex(users, { role: 1 }, { name: 'users_role' });

        console.log('\n✅ Indexes created successfully.');
    } catch (error) {
        console.error('Error fixing database:', error);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

fixDb();
