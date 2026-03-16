import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { User } from '@/models/User';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Helper function to convert UI messages to CoreMessages
function convertToCoreMessages(messages: any[]): any[] {
  const coreMessages: any[] = [];

  for (const message of messages) {
    const { role, content, toolInvocations, experimental_attachments } = message;

    if (role === 'system') {
      coreMessages.push({ role: 'system', content: content || '' });
    } else if (role === 'user') {
      if (experimental_attachments?.length) {
        const contentParts: any[] = [];
        if (content) {
          contentParts.push({ type: 'text', text: content });
        }

        experimental_attachments.forEach((att: any) => {
          if (att.contentType?.startsWith('image/') || att.url?.startsWith('data:image/')) {
            contentParts.push({ type: 'image', image: att.url });
          }
          // Add other types if needed
        });
        coreMessages.push({ role: 'user', content: contentParts });
      } else {
        coreMessages.push({ role: 'user', content: content || '' });
      }
    } else if (role === 'assistant') {
      const toolCalls = toolInvocations?.map((invocation: any) => ({
        type: 'tool-call',
        toolCallId: invocation.toolCallId,
        toolName: invocation.toolName,
        args: invocation.args,
      })) || [];

      const toolResults = toolInvocations?.filter((invocation: any) => 'result' in invocation).map((invocation: any) => ({
        type: 'tool-result',
        toolCallId: invocation.toolCallId,
        toolName: invocation.toolName,
        result: invocation.result,
      })) || [];

      if (toolCalls.length > 0) {
        coreMessages.push({
          role: 'assistant',
          content: [
            { type: 'text', text: content || '' },
            ...toolCalls,
          ].filter((part: any) => part.type === 'tool-call' || (part.type === 'text' && part.text)),
        });

        if (toolResults.length > 0) {
          coreMessages.push({
            role: 'tool',
            content: toolResults,
          });
        }
      } else {
        coreMessages.push({ role: 'assistant', content: content || '' });
      }
    }
  }

  return coreMessages;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const coreMessages = convertToCoreMessages(messages);

    // LOGGING for debug
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logPath = path.join(process.cwd(), 'debug-log.txt');
      fs.appendFileSync(logPath, `\n\n--- Request ${new Date().toISOString()} ---\n`);
      fs.appendFileSync(logPath, JSON.stringify(coreMessages, null, 2));
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

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const result = await streamText({
      model: google('gemini-2.5-flash'),
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
    ${userContext ? '- User Context: ' + userContext : ''}
    `,
      // @ts-ignore
      maxSteps: 8,
      messages: coreMessages,
      toolChoice: 'auto',
      tools: {
        addToCart: tool({
          description: 'Add a product to the shopping cart. You MUST provide the productId.',
          parameters: z.object({
            productId: z.string(),
          }),
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
        } as any),
        navigateToPage: tool({
          description: 'Navigate to a specific page. You MUST provide the page name.',
          parameters: z.object({
            page: z.string().describe('The page to navigate to (home, cart, orders, checkout, profile, wishlist). REQUIRED.'),
          }),
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
        } as any),
        checkInventory: tool({
          description: 'Check inventory stock level for a product.',
          parameters: z.object({
            productName: z.string().describe('The name of the product to check. REQUIRED.'),
          }),
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
        } as any),
        searchProducts: tool({
          description: 'Search for products. You MUST provide the searchQuery.',
          parameters: z.object({
            searchQuery: z.string().describe('The search query. REQUIRED. e.g. "Sony", "camera"'),
          }),
          execute: async ({ searchQuery }: { searchQuery: string }) => {
            let query = searchQuery;
            if (!query) {
              console.error('Search query is missing in args');
              return [];
            }
            try {
              const productsCollection = await getCollection('products');
              const regex = new RegExp(query.split(' ').join('|'), 'i');
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
        } as any),
      },

    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    // Enhanced Error Logging
    console.error('Chat API Error Details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      stack: error.stack,
    });

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
