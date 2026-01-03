import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, resourceHistory, resources, users, guilds } from '@/lib/db'
import { eq, gte, desc, and, sql } from 'drizzle-orm'
import { hasResourceAccess, isDiscordServerOwner } from '@/lib/discord-roles'
import { canAccessGuild } from '@/lib/guild-access'
import { cache, CACHE_KEYS } from '@/lib/cache'

// GET /api/resources/[id]/history?days=7 - Get resource history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const resourceId = params.id

    // Get the resource to check guild permissions
    const resourceData = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1)
    if (resourceData.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    const resource = resourceData[0]
    
    // Check guild-specific access
    if (resource.guildId) {
      const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId)).limit(1)
      
      if (guild.length > 0 && guild[0].discordGuildId) {
        const discordServerId = guild[0].discordGuildId
        const isOwner = isDiscordServerOwner(session, discordServerId)
        const hasGlobalAccess = hasResourceAccess(session.user.roles, isOwner)
        
        // Check guild-specific permissions (any guild member can view history)
        const canAccess = await canAccessGuild(resource.guildId, session.user.roles, hasGlobalAccess)
        
        if (!canAccess) {
          console.log(`[API GET /api/resources/${params.id}/history] User ${session.user.name} denied - not a member of guild ${resource.guildId}`)
          return NextResponse.json({ error: 'You must be a guild member to view this resource history' }, { status: 401 })
        }
      }
    }

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