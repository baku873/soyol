import { ObjectId } from 'mongodb';

export interface OTP {
  _id?: ObjectId;
  phone: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}
