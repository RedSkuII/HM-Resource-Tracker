import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { discordOrders, resources } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { hasResourceAccess } from '@/lib/discord-roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/discord/orders
 * Fetch all Discord orders (pending, fulfilled, cancelled)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !hasResourceAccess(session.user.roles)) {
      return NextResponse.json(
        { error: 'Unauthorized - requires resource access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query based on status filter
    let query;
    if (status === 'all') {
      query = await db
        .select()
        .from(discordOrders)
        .orderBy(desc(discordOrders.createdAt))
        .limit(limit);
    } else {
      query = await db
        .select()
        .from(discordOrders)
        .where(eq(discordOrders.status, status))
        .orderBy(desc(discordOrders.createdAt))
        .limit(limit);
    }

    return NextResponse.json(
      { orders: query },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching Discord orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Discord orders' },
      { status: 500 }
    );
  }
}
