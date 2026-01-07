import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getUserIdentifier } from '@/lib/auth'
import { db } from '@/lib/db'
import { resources, resourceHistory, leaderboard, websiteChanges, users, guilds } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { hasResourceAccess, hasResourceAdminAccess, isDiscordServerOwner } from '@/lib/discord-roles'
import { awardPoints } from '@/lib/leaderboard'
import { canAccessGuild } from '@/lib/guild-access'

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

  // Check if user is super admin - they bypass all permission checks
  const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
  const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

  try {
    // Get the resource with username lookup and guild info
    const resourceData = await db
      .select({
        id: resources.id,
        guildId: resources.guildId,
        guildName: guilds.title, // Include guild name for display
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
      .leftJoin(guilds, eq(resources.guildId, guilds.id))
      .where(eq(resources.id, params.id))
      .limit(1)
    
    if (resourceData.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const resource = resourceData[0]

    // Verify user has access to the resource's guild (super admins bypass this)
    if (resource.guildId && !isSuperAdmin) {
      // Use session data for guild verification - no Discord API calls needed
      const userDiscordServers = session.user.allServerIds || []
      const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId!)).limit(1)
      
      if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
        return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
      }
      
      // Check resource access for THIS specific Discord server
      const discordServerId = guild[0].discordGuildId
      const serverRoles = session.user.serverRolesMap?.[discordServerId] || []
      const isOwner = isDiscordServerOwner(session, discordServerId)
      const hasGlobalAccess = hasResourceAccess(serverRoles, isOwner)
      
      // Check guild-specific permissions
      const canAccess = await canAccessGuild(resource.guildId, serverRoles, hasGlobalAccess)
      
      if (!canAccess) {
        return NextResponse.json({ error: 'You must be a guild member to view this resource' }, { status: 403 })
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

  // Check if user is super admin - they bypass all permission checks
  const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
  const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

  try {
    const { quantity, updateType = 'absolute', value, reason } = await request.json()
    const userId = getUserIdentifier(session)
    
    // Get current resource for history logging and points calculation
    const currentResource = await db.select().from(resources).where(eq(resources.id, params.id))
    if (currentResource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Verify user has access to the resource's guild (super admins bypass this)
    const resource = currentResource[0]
    if (resource.guildId && !isSuperAdmin) {
      // Use session data for guild verification - no Discord API calls needed
      const userDiscordServers = session.user.allServerIds || []
      const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId!)).limit(1)
      
      if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
        return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
      }
      
      // Check resource access for THIS specific Discord server
      const discordServerId = guild[0].discordGuildId
      const serverRoles = session.user.serverRolesMap?.[discordServerId] || []
      const isOwner = isDiscordServerOwner(session, discordServerId)
      const hasGlobalAccess = hasResourceAccess(serverRoles, isOwner)
      
      // Check guild-specific permissions (any guild member can update quantities)
      const { canUpdateGuildResources } = await import('@/lib/guild-access')
      const canUpdate = await canUpdateGuildResources(resource.guildId!, serverRoles, hasGlobalAccess)
      
      if (!canUpdate) {
        console.log(`[API PUT /api/resources/${params.id}] User ${session.user.name} denied - not a member of guild ${resource.guildId}`)
        return NextResponse.json({ error: 'You must be a guild member to update resources' }, { status: 401 })
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
    // Use specific change types so bot can auto-create orders on decreases
    const websiteChangeType = changeAmount > 0 ? 'resource_increase' : 
                              changeAmount < 0 ? 'resource_decrease' : 'resource_update'
    await db.insert(websiteChanges).values({
      id: nanoid(),
      changeType: websiteChangeType,
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
        session.user.id,  // Use Discord ID for consistent leaderboard tracking
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

  // Check if user is super admin - they bypass all permission checks
  const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
  const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

  try {
    // Get the resource first to check guild access
    const resource = await db.select().from(resources).where(eq(resources.id, params.id)).limit(1)
    
    if (resource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    // Verify user has access to the resource's guild (super admins bypass)
    if (resource[0].guildId && !isSuperAdmin) {
      // Use session data for guild verification - no Discord API calls needed
      const userDiscordServers = session.user.allServerIds || []
      const guild = await db.select().from(guilds).where(eq(guilds.id, resource[0].guildId!)).limit(1)
      
      if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
        return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
      }
      
      // Check admin access for THIS specific Discord server
      const discordServerId = guild[0].discordGuildId
      const serverRoles = session.user.serverRolesMap?.[discordServerId] || []
      const isOwner = isDiscordServerOwner(session, discordServerId)
      const hasGlobalAdmin = hasResourceAdminAccess(serverRoles, isOwner)
      
      // Check guild-specific permissions (leaders/officers can manage resources)
      const { canManageGuildResources } = await import('@/lib/guild-access')
      const canManage = await canManageGuildResources(resource[0].guildId!, serverRoles, hasGlobalAdmin)
      
      if (!canManage) {
        console.log(`[API DELETE /api/resources/${params.id}] User ${session.user.name} denied - not a leader/officer of guild ${resource[0].guildId}`)
        return NextResponse.json({ error: 'Only guild leaders and officers can delete resources' }, { status: 403 })
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