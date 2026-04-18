import { getCollection } from "./mongodb";
import { User, PushToken } from "@/types/User";

let admin: any = null;

async function getFirebaseAdmin() {
  if (typeof window !== "undefined") return null; // Server-side only

  if (admin) return admin;

  const firebaseAdmin = await import("firebase-admin");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("FCM: Missing Firebase environment variables");
    return null;
  }

  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  admin = firebaseAdmin;
  return admin;
}

export async function sendPushToAllUsers({
  title,
  body,
  imageUrl,
  data,
}: {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}) {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) return;

    const usersCollection = await getCollection<User>("users");
    // Find all users who have at least one push token
    const usersWithTokens = await usersCollection
      .find(
        { "pushTokens.0": { $exists: true } },
        { projection: { _id: 1, pushTokens: 1 } },
      )
      .toArray();

    const allTokens: { token: string; userId: string }[] = [];
    usersWithTokens.forEach((user) => {
      if (user.pushTokens) {
        user.pushTokens.forEach((pt: PushToken) => {
          allTokens.push({ token: pt.token, userId: user._id.toString() });
        });
      }
    });

    if (allTokens.length === 0) {
      console.log("FCM: No tokens found to notify");
      return;
    }

    const tokensOnly = allTokens.map((t) => t.token);

    // Chunk tokens into groups of 500 (FCM limit for multicast)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < tokensOnly.length; i += CHUNK_SIZE) {
      const chunk = tokensOnly.slice(i, i + CHUNK_SIZE);

      const message = {
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: data || {},
        tokens: chunk,
      };

      const response = await firebase.messaging().sendEachForMulticast(message);

      // Handle failures (cleanup invalid tokens)
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered"
            ) {
              tokensToRemove.push(chunk[idx]);
            }
          }
        });

        if (tokensToRemove.length > 0) {
          console.log(`FCM: Removing ${tokensToRemove.length} invalid tokens`);
          await usersCollection.updateMany({}, {
            $pull: { pushTokens: { token: { $in: tokensToRemove } } },
          } as any);
        }
      }
    }

    console.log(`FCM: Sent notification to ${tokensOnly.length} targets`);
  } catch (error) {
    console.error("FCM Error:", error);
  }
}

/**
 * Send a push notification to a specific user by their MongoDB userId.
 */
export async function sendPushToUser({
  userId,
  title,
  body,
  imageUrl,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}) {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) return;

    const { ObjectId } = await import("mongodb");
    const usersCollection = await getCollection<User>("users");
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { pushTokens: 1 } },
    );

    if (!user?.pushTokens || user.pushTokens.length === 0) {
      console.log(`FCM: No tokens for user ${userId}`);
      return;
    }

    const tokens = user.pushTokens.map((pt: PushToken) => pt.token);

    const message = {
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: data || {},
      tokens,
    };

    const response = await firebase.messaging().sendEachForMulticast(message);

    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await usersCollection.updateMany({}, {
          $pull: { pushTokens: { token: { $in: tokensToRemove } } },
        } as any);
      }
    }

    console.log(`FCM: Sent to user ${userId} (${tokens.length} devices)`);
  } catch (error) {
    console.error(`FCM Error (user ${userId}):`, error);
  }
}
