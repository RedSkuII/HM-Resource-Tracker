import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getUserIdentifier } from '@/lib/auth'
import { db, resourceHistory, resources, users } from '@/lib/db'
import { eq, gte, desc, and, or, sql, inArray } from 'drizzle-orm'
import { hasResourceAccess } from '@/lib/discord-roles'
import { getAccessibleGuildsForUser } from '@/lib/guild-access'

// GET /api/user/activity - Get user's activity history
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user.permissions?.hasResourceAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const isGlobal = searchParams.get('global') === 'true'
    const limit = parseInt(searchParams.get('limit') || '500')
    const guildId = searchParams.get('guildId')
    const userId = getUserIdentifier(session)

    // SECURITY: Get accessible guilds for user to prevent cross-guild data leakage
    const accessibleGuildIds = await getAccessibleGuildsForUser(session)
    
    if (accessibleGuildIds.length === 0) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // If specific guild requested, verify access
    let targetGuildIds: string[]
    if (guildId) {
      if (!accessibleGuildIds.includes(guildId)) {
        return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
      }
      targetGuildIds = [guildId]
    } else {
      targetGuildIds = accessibleGuildIds
    }

    // For backward compatibility, also check for old user identifiers
    const oldUserIds = [
      session.user.id,
      session.user.email, 
      session.user.name,
      'unknown'
    ].filter(Boolean)

    // Calculate date threshold
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    // Fetch activity from database with resource names and categories
    // SECURITY: Always filter by accessible guilds
    const activity = await db
      .select({
        id: resourceHistory.id,
        resourceId: resourceHistory.resourceId,
        resourceName: resources.name,
        resourceCategory: resources.category,
        previousQuantity: resourceHistory.previousQuantity,
        newQuantity: resourceHistory.newQuantity,
        changeAmount: resourceHistory.changeAmount,
        changeType: resourceHistory.changeType,
        reason: resourceHistory.reason,
        updatedBy: sql<string>`COALESCE(${users.customNickname}, ${users.username}, ${resourceHistory.updatedBy})`.as('updatedBy'),
        createdAt: resourceHistory.createdAt,
      })
      .from(resourceHistory)
      .innerJoin(resources, eq(resourceHistory.resourceId, resources.id))
      .leftJoin(users, eq(resourceHistory.updatedBy, users.discordId))
      .where(
        and(
          // SECURITY: Always filter by accessible guilds
          inArray(resources.guildId, targetGuildIds),
          gte(resourceHistory.createdAt, daysAgo),
          // Global vs user-specific filter
          isGlobal 
            ? undefined
            : or(
                eq(resourceHistory.updatedBy, userId),
                ...oldUserIds.map(id => eq(resourceHistory.updatedBy, id as string))
              )
        )
      )
      .orderBy(desc(resourceHistory.createdAt))
      .limit(limit)

    return NextResponse.json(activity, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching user activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
} 