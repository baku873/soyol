import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import type { AuthProvider, User } from '@/types/User';

export type PublicUser = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  /** Same as `avatar`; kept for older UI that still reads `imageUrl`. */
  imageUrl?: string;
  provider: AuthProvider;
  role?: 'admin' | 'user' | 'vendor';
  phone?: string;
};

export function toPublicUser(user: User): PublicUser {
  const pic = user.avatar || user.image;
  return {
    id: user._id?.toString() || '',
    name: user.name,
    email: user.email,
    avatar: pic,
    imageUrl: pic,
    provider: user.provider,
    role: user.role,
    phone: user.phone,
  };
}

export async function findUserById(userId: string): Promise<User | null> {
  const users = await getCollection<User>('users');
  return users.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getCollection<User>('users');
  return users.findOne({ email: email.toLowerCase() });
}

export async function findUserByProvider(provider: AuthProvider, providerId: string): Promise<User | null> {
  const users = await getCollection<User>('users');
  return users.findOne({ provider, providerId });
}

export async function createLocalUser(input: { name: string; email: string; passwordHash: string; avatar?: string }) {
  const users = await getCollection<User>('users');
  const now = new Date();
  const doc: Omit<User, '_id'> = {
    name: input.name,
    email: input.email.toLowerCase(),
    password: input.passwordHash,
    avatar: input.avatar,
    provider: 'local',
    providerId: undefined,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
    role: 'user',
    status: 'available',
  };
  const result = await users.insertOne(doc as User);
  return users.findOne({ _id: result.insertedId });
}

/**
 * OAuth upsert with linking rule:
 * - If providerId exists (any provider) -> same identity, refresh profile.
 * - Else if email exists -> link providerId; keep `local` when the account has a password.
 * - Else create new user.
 */
export async function upsertOauthUser(input: {
  provider: 'google' | 'facebook';
  providerId: string;
  email?: string;
  name: string;
  avatar?: string;
}) {
  const users = await getCollection<User>('users');
  const now = new Date();

  const byProviderId = await users.findOne({ providerId: input.providerId });
  if (byProviderId) {
    await users.updateOne(
      { _id: byProviderId._id },
      {
        $set: {
          name: input.name || byProviderId.name,
          ...(input.email ? { email: input.email.toLowerCase() } : {}),
          ...(input.avatar ? { avatar: input.avatar } : {}),
          updatedAt: now,
        },
      },
    );
    return users.findOne({ _id: byProviderId._id });
  }

  const emailNormalized = input.email ? input.email.toLowerCase() : undefined;
  if (emailNormalized) {
    const byEmail = await users.findOne({ email: emailNormalized });
    if (byEmail) {
      const keepLocal = byEmail.provider === 'local' && !!byEmail.password;
      await users.updateOne(
        { _id: byEmail._id },
        {
          $set: {
            ...(keepLocal ? {} : { provider: input.provider }),
            providerId: input.providerId,
            name: input.name || byEmail.name,
            ...(input.avatar ? { avatar: input.avatar } : {}),
            updatedAt: now,
          },
        },
      );
      return users.findOne({ _id: byEmail._id });
    }
  }

  const doc: Omit<User, '_id'> = {
    name: input.name,
    email: emailNormalized,
    password: null,
    avatar: input.avatar,
    provider: input.provider,
    providerId: input.providerId,
    isVerified: true,
    createdAt: now,
    updatedAt: now,
    role: 'user',
    status: 'available',
  };
  const result = await users.insertOne(doc as User);
  return users.findOne({ _id: result.insertedId });
}

