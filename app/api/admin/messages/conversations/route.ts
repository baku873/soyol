import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import type { Conversation } from '@/types/Support';

// GET: List all conversations for admins
export async function GET(req: NextRequest) {
  try {
    const { role } = await auth();
    if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get('filter'); // all, unread, unassigned, resolved
    const search = searchParams.get('search');
    
    const query: any = {};
    
    if (filter === 'unread') {
      query.unreadByAdmin = { $gt: 0 };
      query.status = { $ne: 'resolved' };
    } else if (filter === 'unassigned') {
      query.assignedAdminId = null;
      query.status = { $ne: 'resolved' };
    } else if (filter === 'resolved') {
      query.status = 'resolved';
    } else if (filter === 'my') {
      const { userId } = await auth();
      query.assignedAdminId = new ObjectId(userId!);
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const col = await getCollection<Conversation>('support_conversations');
    const conversations = await col.aggregate([
      { $match: query },
      { $sort: { unreadByAdmin: -1, lastMessageAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          status: 1,
          subject: 1,
          priority: 1,
          lastMessageAt: 1,
          lastMessagePreview: 1,
          unreadByAdmin: 1,
          createdAt: 1,
          assignedAdminId: 1,
          'user.name': 1,
          'user.email': 1
        }
      }
    ]).toArray();

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
