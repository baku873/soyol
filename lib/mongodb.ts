import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGO_DB = process.env.MONGO_DB || 'Buddha';

const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

let clientPromise: Promise<MongoClient>;
let client: MongoClient; // Declare client here to be accessible in both branches

if (process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} else {
  // Provide a dummy promise that will reject if actually awaited,
  // but won't crash the server during build-time module evaluation.
  clientPromise = Promise.reject(new Error('MONGODB_URI is not set. Add it to .env (Next.js) or preload with `import "dotenv/config"` / `node --env-file=.env` when running standalone scripts.'));
  // Catch the rejection immediately so Node doesn't log unhandled promise warnings
  clientPromise.catch(() => { });
}

export { clientPromise };

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGO_DB);
}

export async function getCollection<T extends Document = Document>(
  name: string
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}
