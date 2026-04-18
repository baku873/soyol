
export interface Notification {
    _id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'message' | 'system';
    isRead: boolean;
    link?: string;
    createdAt: Date;
}
