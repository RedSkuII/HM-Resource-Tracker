import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getUserIdentifier } from '@/lib/auth'
import { db } from '@/lib/db'
import { resources, resourceHistory, leaderboard, websiteChanges, users } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { hasResourceAccess, hasResourceAdminAccess } from '@/lib/discord-roles'
import { awardPoints } from '@/lib/leaderboard'

// Calculate status based on quantity vs target
const calculateResourceStatus = (quantity: number, targetQuantity: number | null): 'above_target' | 'at_target' | 'below_target' | 'critical' => {
  if (!targetQuantity || targetQuantity <= 0) return 'at_target'

  const percentage = (quantity / targetQuantity) * 100
  if (percentage >= 150) return 'above_target'    // Purple - well above target
  if (percentage >= 100) return 'at_target'       // Green - at or above target
  if (percentage >= 50) return 'below_target'     // Orange - below target but not critical
  return 'critical'                               // Red - very much below target
}

// Import role-checking functions from discord-roles.ts
import { hasTargetEditAccess } from '@/lib/discord-roles'

// GET /api/resources/[id] - Get single resource
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the resource with username lookup
    const resourceData = await db
      .select({
        id: resources.id,
        guildId: resources.guildId,
        name: resources.name,
        quantity: resources.quantity,
        description: resources.description,
        category: resources.category,
        icon: resources.icon,
        imageUrl: resources.imageUrl,
        status: resources.status,
        targetQuantity: resources.targetQuantity,
        multiplier: resources.multiplier,
        lastUpdatedBy: sql<string>`COALESCE(${users.customNickname}, ${users.username}, ${resources.lastUpdatedBy})`.as('lastUpdatedBy'),
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
      })
      .from(resources)
      .leftJoin(users, eq(resources.lastUpdatedBy, users.discordId))
      .where(eq(resources.id, params.id))
      .limit(1)
    
    if (resourceData.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const resource = resourceData[0]

    // Verify user has access to the resource's guild
    if (resource.guildId) {
      const discordToken = (session as any).accessToken
      if (discordToken) {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { 'Authorization': `Bearer ${discordToken}` },
        })
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const userDiscordServers = servers.map((server: any) => server.id)
          const { guilds } = await import('@/lib/db')
          const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId!)).limit(1)
          
          if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
            return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
          }
          
          // Check resource access for THIS specific Discord server
          const { isDiscordServerOwner } = await import('@/lib/discord-roles')
          const discordServerId = guild[0].discordGuildId
          const isOwner = isDiscordServerOwner(session, discordServerId)
          
          if (!hasResourceAccess(session.user.roles, isOwner)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          }
        }
      }
    }

    return NextResponse.json(resource, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching resource:', error)
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 })
  }
}

// PUT /api/resources/[id] - Update single resource
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { quantity, updateType = 'absolute', value, reason } = await request.json()
    const userId = getUserIdentifier(session)
    
    // Get current resource for history logging and points calculation
    const currentResource = await db.select().from(resources).where(eq(resources.id, params.id))
    if (currentResource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Verify user has access to the resource's guild
    const resource = currentResource[0]
    if (resource.guildId) {
      const discordToken = (session as any).accessToken
      if (discordToken) {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { 'Authorization': `Bearer ${discordToken}` },
        })
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const userDiscordServers = servers.map((server: any) => server.id)
          const { guilds } = await import('@/lib/db')
          const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId!)).limit(1)
          
          if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
            return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
          }
          
          // Check resource access for THIS specific Discord server
          const { isDiscordServerOwner } = await import('@/lib/discord-roles')
          const discordServerId = guild[0].discordGuildId
          const isOwner = isDiscordServerOwner(session, discordServerId)
          
          if (!hasResourceAccess(session.user.roles, isOwner)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          }
        }
      }
    }

    const previousQuantity = resource.quantity
    const changeAmount = updateType === 'relative' ? value : quantity - previousQuantity

    // Update the resource
    await db.update(resources)
      .set({
        quantity: quantity,
        lastUpdatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, params.id))

    // Log the change in history
    await db.insert(resourceHistory).values({
      id: nanoid(),
      resourceId: params.id,
      guildId: resource.guildId,
      previousQuantity,
      newQuantity: quantity,
      changeAmount,
      changeType: updateType || 'absolute',
      updatedBy: userId,
      reason: reason,
      createdAt: new Date(),
    })

    // Log website change for Discord bot to detect
    await db.insert(websiteChanges).values({
      id: nanoid(),
      changeType: 'resource_update',
      resourceId: params.id,
      orderId: null,
      previousValue: String(previousQuantity),
      newValue: String(quantity),
      changedBy: userId,
      createdAt: new Date(),
      processedByBot: false,
    })

    // Award points if quantity changed
    let pointsCalculation = null
    if (changeAmount !== 0) {
      const actionType: 'ADD' | 'SET' | 'REMOVE' = 
        updateType === 'absolute' ? 'SET' :
        changeAmount > 0 ? 'ADD' : 'REMOVE'

      // Calculate the current status for bonus calculation
      const resourceStatus = calculateResourceStatus(resource.quantity, resource.targetQuantity)

      pointsCalculation = await awardPoints(
        getUserIdentifier(session),
        params.id,
        actionType,
        Math.abs(changeAmount),
        {
          name: resource.name,
          category: resource.category || 'Other',
          status: resourceStatus,
          multiplier: resource.multiplier || 1.0,
          guildId: resource.guildId
        }
      )
    }

    // Get the updated resource
    const updatedResource = await db.select().from(resources).where(eq(resources.id, params.id))
    
    return NextResponse.json({
      resource: updatedResource[0],
      pointsEarned: pointsCalculation?.finalPoints || 0,
      pointsCalculation
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
} 

// DELETE /api/resources/[id] - Delete resource and all its history (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the resource first to check guild access
    const resource = await db.select().from(resources).where(eq(resources.id, params.id)).limit(1)
    
    if (resource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    // Verify user has access to the resource's guild
    if (resource[0].guildId) {
      const discordToken = (session as any).accessToken
      if (discordToken) {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { 'Authorization': `Bearer ${discordToken}` },
        })
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const userDiscordServers = servers.map((server: any) => server.id)
          const { guilds } = await import('@/lib/db')
          const guild = await db.select().from(guilds).where(eq(guilds.id, resource[0].guildId!)).limit(1)
          
          if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
            return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
          }
          
          // Check admin access for THIS specific Discord server
          const { isDiscordServerOwner } = await import('@/lib/discord-roles')
          const discordServerId = guild[0].discordGuildId
          const isOwner = isDiscordServerOwner(session, discordServerId)
          
          if (!hasResourceAdminAccess(session.user.roles, isOwner)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
          }
        }
      }
    }

  try {
    // Check if resource exists
    const resource = await db.select().from(resources).where(eq(resources.id, params.id))
    if (resource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Verify user has access to the resource's guild
    if (resource[0].guildId) {
      const discordToken = (session as any).accessToken
      if (discordToken) {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { 'Authorization': `Bearer ${discordToken}` },
        })
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const userDiscordServers = servers.map((server: any) => server.id)
          const { guilds } = await import('@/lib/db')
          const guild = await db.select().from(guilds).where(eq(guilds.id, resource[0].guildId!)).limit(1)
          if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
            return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
          }
        }
      }
    }

    // Delete all related records first (due to foreign key constraints)
    // 1. Delete leaderboard entries for this resource
    await db.delete(leaderboard).where(eq(leaderboard.resourceId, params.id))
    
    // 2. Delete all history entries for this resource
    await db.delete(resourceHistory).where(eq(resourceHistory.resourceId, params.id))
    
    // 3. Finally delete the resource itself
    await db.delete(resources).where(eq(resources.id, params.id))

    return NextResponse.json({ message: 'Resource and all related data deleted successfully' }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }
} 