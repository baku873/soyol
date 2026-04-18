import { ObjectId } from 'mongodb';

export interface Review {
    _id?: ObjectId;
    productId: string;
    userId: string;
    userName?: string;
    userImage?: string;
    orderId: string;         // Restrict to people who ordered
    rating: number;          // 1-5
    comment?: string;
    images?: string[];
    verified: boolean;       // Purchase verified
    helpful: number;         // Count of helpful votes
    createdAt: Date;
    updatedAt: Date;
}
