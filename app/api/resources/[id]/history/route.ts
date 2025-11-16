import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, resourceHistory, users } from '@/lib/db'
import { eq, gte, desc, and, sql } from 'drizzle-orm'
import { hasResourceAccess } from '@/lib/discord-roles'
import { cache, CACHE_KEYS } from '@/lib/cache'

// GET /api/resources/[id]/history?days=7 - Get resource history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  // Check if user is a server owner
  const { isDiscordServerOwner } = await import('@/lib/discord-roles')
  const isOwner = isDiscordServerOwner(session)
  
  if (!session || !hasResourceAccess(session.user.roles, isOwner)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const resourceId = params.id

    // Remove cache check to prevent stale data on Vercel
    // const cacheKey = CACHE_KEYS.RESOURCE_HISTORY(resourceId, days)
    // const cachedHistory = cache.get(cacheKey)
    // if (cachedHistory) {
    //   return NextResponse.json(cachedHistory)
    // }

    // Calculate date threshold
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    // Fetch history from database with user information
    const history = await db
      .select({
        id: resourceHistory.id,
        resourceId: resourceHistory.resourceId,
        guildId: resourceHistory.guildId,
        previousQuantity: resourceHistory.previousQuantity,
        newQuantity: resourceHistory.newQuantity,
        changeAmount: resourceHistory.changeAmount,
        changeType: resourceHistory.changeType,
        updatedBy: sql<string>`COALESCE(${users.customNickname}, ${users.username}, ${resourceHistory.updatedBy})`.as('updatedBy'),
        reason: resourceHistory.reason,
        createdAt: resourceHistory.createdAt,
      })
      .from(resourceHistory)
      .leftJoin(users, eq(resourceHistory.updatedBy, users.discordId))
      .where(
        and(
          eq(resourceHistory.resourceId, resourceId),
          gte(resourceHistory.createdAt, daysAgo)
        )
      )
      .orderBy(desc(resourceHistory.createdAt))
      .limit(100) // Limit to reduce load

    // Return fresh data with cache-busting headers
    return NextResponse.json(history, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching resource history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
} 