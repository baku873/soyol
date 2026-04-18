import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs, convertToModelMessages, zodSchema, type ModelMessage, type ToolExecuteFunction } from 'ai';
import { z } from 'zod';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { User } from '@/types/User';
import { Product } from '@/types/Product';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.Deepseek_API,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const modelMessages = await convertToModelMessages(messages);

    // LOGGING for debug
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logPath = path.join(process.cwd(), 'debug-log.txt');
      fs.appendFileSync(logPath, `\n\n--- Request ${new Date().toISOString()} ---\n`);
      fs.appendFileSync(logPath, JSON.stringify(modelMessages, null, 2));
    } catch (e) { console.error('Logging failed', e); }

    const session = await auth();
    let userContext = '';

    if (session?.userId) {
      try {
        const users = await getCollection<User>('users');
        const user = await users.findOne({ _id: new ObjectId(session.userId) });
        if (user?.addresses?.length) {
          userContext = `
          Хэрэглэгчийн хадгалсан хаягууд:
          ${user.addresses.map((a, i) => `
          ${i + 1}. ID: ${a.id} | [${a.label || 'Хаяг ' + (i + 1)}] ${a.isDefault ? '(Үндсэн)' : ''}
             - ${a.city}, ${a.district}, ${a.street}
          `).join('\n')}
          Утас: ${user.phone || 'Бүртгэлгүй'}
          `;
        }
      } catch (err) {
        console.error('Failed to fetch user context:', err);
      }
    }

    const result = await streamText({
      model: openrouter.chat('google/gemini-2.5-flash'),
      system: `
    You are the "Loyal Assistant Operator" for Soyol Video Shop, a premium electronics and video equipment store in Mongolia.
    
    Your Personality:
    - Professional yet friendly and approachable.
    - Helpful, proactive, and knowledgeable about video gear (cameras, lights, drones, audio).
    - You speak fluent Mongolian (primary) and English.
    - Always address the user politely.
    
    Your Capabilities:
    - Help users find products using the 'searchProducts' tool.
    - Check stock availability using 'checkInventory'.
    - Add items to the cart using 'addToCart' (only if the user explicitly confirms).
    - Guide users to specific pages using 'navigateToPage'.
    
    Output Requirements:
    - ALWAYS give a clear final answer in Mongolian after any tool call.
    - NEVER finish the conversation with tool-calls. Always continue and return a final assistant message.
    - If products are found, start the response with: "Танд дараах бараануудыг санал болгож байна ✨"
    - PRESENT products by including card markers in this exact format on its own line:
        [PRODUCT_CARD: {"id":"...","name":"...","price":1234,"image":"..."}]
      Only include id, name, price, image keys in the card JSON.
    - Do NOT print raw tool call JSON; summarize first, then include PRODUCT_CARD tags.
    - Use friendly, concise sentences. Avoid repeating the same content.
    - Always end your response with: "Танд өөр туслах зүйл байна уу? 😊"
    - Never say phrases implying no warranty (e.g., "баталгаа байхгүй"). Use helpful phrasing instead.
    - If the user sends an image, analyze it using your multimodal capabilities. Infer the likely product type, brand, or model from the image and use 'searchProducts' with a concise Mongolian query to find matching items in the shop.
    - If the image contains a specific product, describe what you see and suggest matching products from our catalog.
    
    Context:
    - Today's date is ${new Date().toLocaleDateString('mn-MN')}.
    ${userContext ? '- ' + userContext : ''}
    `,
      stopWhen: stepCountIs(8),
      messages: modelMessages,
      toolChoice: 'auto',
      tools: {
        addToCart: tool({
          description: 'Хэрэглэгчийн сагсанд бараа нэмэх. Барааны ID болон тоо ширхэг шаардлагатай.',
          inputSchema: zodSchema(z.object({
            productId: z.string(),
          })),
          execute: async ({ productId }: { productId: string }) => {
            if (!productId) return 'Error: productId is missing.';

            try {
              const productsCollection = await getCollection('products');
              let product;
              try {
                const { ObjectId } = await import('mongodb');
                product = await productsCollection.findOne({ _id: new ObjectId(productId) });
              } catch (e) {
                product = await productsCollection.findOne({ _id: productId as any });
              }

              if (!product) {
                return 'Product not found with that ID.';
              }

              const productData = {
                id: product._id.toString(),
                name: product.name,
                price: product.price,
                image: product.image || '',
                quantity: 1
              };

              return `[ACTION:ADD_TO_CART_DATA:${JSON.stringify(productData)}:END_ACTION] Added ${product.name} to cart.`;
            } catch (error) {
              console.error('Add to cart error:', error);
              return 'Error adding to cart.';
            }
          },
        }),
        navigateToPage: tool({
          description: 'Хэрэглэгчийг өөр хуудас руу шилжүүлэх (жишээ нь: сагс, захиалга, нүүр хуудас).',
          inputSchema: zodSchema(z.object({
            page: z.string().describe('The page to navigate to (home, cart, orders, checkout, profile, wishlist). REQUIRED.'),
          })),
          execute: async ({ page }: { page: string }) => {
            if (!page) return 'Error: page argument is missing.';

            let path = '/';
            const p = page.toLowerCase();
            if (p.includes('cart')) path = '/cart';
            else if (p.includes('order')) path = '/orders';
            else if (p.includes('checkout')) path = '/checkout';
            else if (p.includes('profile')) path = '/profile';
            else if (p.includes('wishlist')) path = '/wishlist';
            else path = '/';

            return `[ACTION:NAVIGATE:${path}:END_ACTION] Navigating to ${path}.`;
          },
        }),
        checkInventory: tool({
          description: 'Барааны үлдэгдэл эсвэл дэлгэрэнгүй мэдээллийг шалгах.',
          inputSchema: zodSchema(z.object({
            productName: z.string().describe('The name of the product to check. REQUIRED.'),
          })),
          execute: async ({ productName }: { productName: string }) => {
            if (!productName) return 'Error: productName is missing.';
            try {
              const productsCollection = await getCollection('products');
              const product = await productsCollection.findOne({
                $or: [
                  { name: { $regex: new RegExp(productName, 'i') } }
                ]
              });

              if (product) {
                return `Inventory Status for ${product.name}: ${product.inventory ?? 0} units available. Price: ${product.price}₮.`;
              } else {
                return `Product ${productName} not found in inventory.`;
              }
            } catch (error) {
              return 'Error checking inventory.';
            }
          },
        }),
        searchProducts: tool({
          description: 'Дэлгүүрээс бараа хайх.',
          inputSchema: zodSchema(z.object({
            searchQuery: z.string().describe('The search query. REQUIRED. e.g. "Sony", "camera"'),
          })),
          execute: async ({ searchQuery }: { searchQuery: string }) => {
            if (!searchQuery) {
              console.error('Search query is missing in args');
              return [];
            }
            try {
              const productsCollection = await getCollection('products');
              const regex = new RegExp(searchQuery.split(' ').join('|'), 'i');
              const products = await productsCollection.find({
                $or: [
                  { name: { $regex: regex } },
                  { description: { $regex: regex } },
                  { category: { $regex: regex } }
                ]
              }).limit(5).toArray();
              
              return products.map(p => ({
                id: p._id.toString(),
                name: p.name,
                price: p.price,
                stock: p.inventory ?? 0,
                description: p.description || '',
                image: p.image || ''
              }));
            } catch (error) {
              console.error('Search error:', error);
              return [];
            }
          },
        }),
      },

    });

    try {
      return result.toUIMessageStreamResponse();
    } catch (innerError: any) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        fs.appendFileSync(path.join(process.cwd(), 'debug-log.txt'), `\n\nERROR:\n${JSON.stringify(innerError, Object.getOwnPropertyNames(innerError), 2)}`);
      } catch (e) {}
      throw innerError;
    }
  } catch (error: any) {
    // Enhanced Error Logging
    console.error('Chat API Error Details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      stack: error.stack,
    });

    try {
      const fs = await import('fs');
      const path = await import('path');
      fs.appendFileSync(path.join(process.cwd(), 'debug-log.txt'), `\n\nOUTER ERROR:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    } catch (e) {}

    // Check for specific error types
    if (error.message?.includes('API key')) {
      console.error('CRITICAL: API Key missing or invalid');
    } else if (error.status === 429 || error.message?.includes('Quota') || error.message?.includes('429')) {
      console.error('CRITICAL: Quota exceeded (429)');
      return new Response("Уучлаарай, систем хэт ачаалалтай байна. Та хэсэг хугацааны дараа дахин оролдоно уу. (Quota Exceeded)", { status: 200 });
    } else if (error.status === 404 || /model not found/i.test(error.message || '')) {
      console.error('CRITICAL: Model not found (404)');
      return new Response("Түр хүлээгээрэй, холболтоо шалгаж байна...", { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Failed to process chat', details: error.message, stack: error.stack }), { status: 500 });
  }
}
