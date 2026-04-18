import { ObjectId } from 'mongodb';

export interface Message {
    _id?: ObjectId;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'text' | 'call_invite' | 'call_started' | 'call_ended';
    roomName?: string; // For call invites
    duration?: number; // Duration in seconds
    createdAt: Date;
    read: boolean;
}
