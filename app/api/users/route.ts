import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth, currentUser } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const requestedRole = searchParams.get('role');

        // Always enforce authentication
        const { userId, role: userRole } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin хэрэглэгчдийн жагсаалтыг зөвхөн admin харж болно
        if (requestedRole === 'admin' && userRole !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const usersCollection = await getCollection('users');
        const messagesCollection = await getCollection('messages');
        const { userId: adminId } = await auth();

        let query = {};
        if (requestedRole === 'admin') {
            query = { role: 'admin' };
        }

        const users = await usersCollection.find(query, {
            projection: {
                _id: 1,
                name: 1,
                email: 1,
                image: 1,
                role: 1,
                status: 1,
                lastSeen: 1,
                isInCall: 1,
                userId: 1
            }
        }).toArray();

        // Enhance users with real-time messaging data
        const enhancedUsers = await Promise.all(users.map(async (user) => {
            const userIdStr = user._id.toString();

            // 1. Calculate isOnline (within last 5 minutes)
            const isOnline = user.lastSeen &&
                (Date.now() - new Date(user.lastSeen).getTime()) < 5 * 60 * 1000;

            // 2. Count unread messages for the current admin
            let unreadCount = 0;
            if (adminId) {
                const targetReceiverId = userRole === 'admin' ? 'support_admin' : adminId;
                unreadCount = await messagesCollection.countDocuments({
                    receiverId: targetReceiverId,
                    senderId: userIdStr,
                    read: false
                });
            }

            // 3. Get the very last message in this conversation
            const targetId = userRole === 'admin' ? 'support_admin' : adminId;
            const lastMsgDoc = await messagesCollection.findOne(
                {
                    $or: [
                        { senderId: userIdStr, receiverId: targetId },
                        { senderId: targetId, receiverId: userIdStr }
                    ]
                },
                { sort: { createdAt: -1 } }
            );

            return {
                ...user,
                _id: userIdStr,
                id: userIdStr,
                isOnline,
                unreadCount,
                lastMessage: lastMsgDoc ? lastMsgDoc.content : '',
                hasActiveChat: !!lastMsgDoc // Flag to help UI filter active chats
            };
        }));

        // For admins, sort users so those with active chats and unread messages appear first
        if (userRole === 'admin') {
            // Also fetch guests who have chatted with support_admin
            const guestConversations = await messagesCollection.aggregate([
                { $match: { receiverId: 'support_admin', senderId: { $regex: /^guest-/ } } },
                { $sort: { createdAt: 1 } },
                { $group: { 
                    _id: '$senderId', 
                    unreadCount: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } }, 
                    lastMessage: { $last: '$content' }, 
                    lastSeen: { $max: '$createdAt' } 
                } }
            ]).toArray();

            const guestUsers = guestConversations.map(g => ({
                _id: g._id,
                id: g._id,
                userId: g._id,
                name: 'Зочин (Guest)',
                email: 'Зочин',
                isOnline: (Date.now() - new Date(g.lastSeen).getTime()) < 5 * 60 * 1000,
                unreadCount: g.unreadCount,
                lastMessage: g.lastMessage,
                hasActiveChat: true,
                role: 'guest'
            }));

            enhancedUsers.push(...guestUsers);

            enhancedUsers.sort((a, b) => {
                if (a.unreadCount !== b.unreadCount) {
                    return b.unreadCount - a.unreadCount;
                }
                if (a.hasActiveChat && !b.hasActiveChat) return -1;
                if (!a.hasActiveChat && b.hasActiveChat) return 1;
                return 0;
            });
        }

        return NextResponse.json(enhancedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
