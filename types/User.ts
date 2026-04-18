import { ObjectId } from 'mongodb';

export type AuthProvider = 'local' | 'google' | 'facebook';

export interface Address {
  id: string;
  label?: string; // 'Home', 'Work', etc.
  city: string;
  district: string;
  khoroo: string;
  street: string;
  entrance?: string;
  floor?: string;
  door?: string;
  note?: string;
  isDefault: boolean;
}

export interface PushToken {
  token: string;
  platform: string;
  createdAt: Date;
}

/**
 * MongoDB User document.
 *
 * Notes:
 * - Email is intended to be unique+sparce at the DB level.
 * - Password is only present for "local" accounts.
 * - provider/providerId support OAuth identity. If an OAuth login comes in for an
 *   existing local account (same email), we link by setting provider/providerId.
 *
 * This interface preserves some legacy fields used by the existing shop app
 * (phone/role/status/etc.) while enabling the new hybrid auth.
 */
export interface User {
  _id?: ObjectId;

  // Required by new hybrid auth
  name: string;
  email?: string;
  password?: string | null;
  avatar?: string;
  provider: AuthProvider;
  providerId?: string;
  isVerified: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Legacy (existing app expectations)
  phone?: string;
  role?: 'admin' | 'user' | 'vendor';
  status?: 'available' | 'in-call';
  image?: string;
  addresses?: Address[];
  pushTokens?: PushToken[];
  lastSeen?: Date;
}
