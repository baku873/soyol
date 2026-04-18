import { ObjectId } from 'mongodb';

export interface Store {
    _id?: ObjectId;
    vendorId: string;
    handle: string;           // URL slug, unique (@myshop)
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    status: 'pending' | 'active' | 'suspended';
    commissionRate: number;   // % жишээ: 10
    phone?: string;
    email?: string;
    totalSales: number;
    totalOrders: number;
    createdAt: Date;
    updatedAt: Date;
}
