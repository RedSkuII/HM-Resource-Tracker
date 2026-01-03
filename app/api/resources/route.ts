import { NextRequest, NextResponse } from 'next/server'
import { db, resources, resourceHistory, websiteChanges, users } from '@/lib/db'
import { eq, count, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Force dynamic rendering - API routes should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lazy imports for auth-related functionality to avoid blocking GET requests
const getAuthDependencies = async () => {
  const { getServerSession } = await import('next-auth')
  const { authOptions, getUserIdentifier } = await import('@/lib/auth')
  const { hasResourceAccess, hasResourceAdminAccess } = await import('@/lib/discord-roles')
  const { awardPoints } = await import('@/lib/leaderboard')
  const { canAccessGuild } = await import('@/lib/guild-access')
  return { getServerSession, authOptions, getUserIdentifier, hasResourceAccess, hasResourceAdminAccess, awardPoints, canAccessGuild }
}

// Calculate status based on quantity vs target
const calculateResourceStatus = (quantity: number, targetQuantity: number | null): 'above_target' | 'at_target' | 'below_target' | 'critical' => {
  if (!targetQuantity || targetQuantity <= 0) return 'at_target'

  const percentage = (quantity / targetQuantity) * 100
  if (percentage >= 150) return 'above_target'    // Purple - well above target
  if (percentage >= 100) return 'at_target'       // Green - at or above target
  if (percentage >= 50) return 'below_target'     // Orange - below target but not critical
  return 'critical'                               // Red - very much below target
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const search = searchParams.get('search') || ''
    
    // Quick auth check - just verify user is logged in
    // Detailed permission checks are done at page level, not per-request
    if (guildId) {
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('@/lib/auth')
      const session = await getServerSession(authOptions)
      
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Use session data for quick server membership check (no Discord API calls)
      const userDiscordServers = session.user.allServerIds || []
      const { guilds } = await import('@/lib/db')
      const guild = await db.select({ discordGuildId: guilds.discordGuildId }).from(guilds).where(eq(guilds.id, guildId)).limit(1)
      
      if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }
    
    // Validate pagination params
    const validatedPage = Math.max(1, page)
    const validatedLimit = Math.min(Math.max(1, limit), 100) // Max 100 per page
    const offset = (validatedPage - 1) * validatedLimit
    
    // Build where clause with guild filter and search
    const { and, like } = await import('drizzle-orm')
    let whereClause
    if (guildId && search) {
      whereClause = and(eq(resources.guildId, guildId), like(resources.name, `%${search}%`))
    } else if (guildId) {
      whereClause = eq(resources.guildId, guildId)
    } else if (search) {
      whereClause = like(resources.name, `%${search}%`)
    } else {
      whereClause = undefined
    }
    
    // Get total count using SQL COUNT - much faster than fetching all rows
    const countResult = await db
      .select({ count: count() })
      .from(resources)
      .where(whereClause)
    
    const totalCount = countResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / validatedLimit)
    
    // Get paginated results with username lookup
    const paginatedResources = await db
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
      .where(whereClause)
      .limit(validatedLimit)
      .offset(offset)
    
    return NextResponse.json({
      resources: paginatedResources,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        totalCount,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0',
      }
    })
  } catch (error) {
    console.error('[API /api/resources] Error fetching resources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resources', details: error instanceof Error ? error.message : String(error) },
      { status: 500 })
  }
}

// POST /api/resources - Create new resource (admin or guild leader/officer)
export async function POST(request: NextRequest) {
  const { getServerSession, authOptions, getUserIdentifier, hasResourceAdminAccess } = await getAuthDependencies()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { guildId, name, category, description, imageUrl, quantity, targetQuantity, multiplier } = await request.json()
    const userId = getUserIdentifier(session)

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 })
    }

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required' }, { status: 400 })
    }

    // Get the Discord server ID for this guild
    const { guilds } = await import('@/lib/db')
    const { eq } = await import('drizzle-orm')
    const guildData = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
    
    if (guildData.length === 0 || !guildData[0].discordGuildId) {
      return NextResponse.json({ error: 'Guild not found or not configured' }, { status: 404 })
    }
    
    const discordServerId = guildData[0].discordGuildId
    
    // Check if user owns THIS specific Discord server
    const { isDiscordServerOwner } = await import('@/lib/discord-roles')
    const isOwner = isDiscordServerOwner(session, discordServerId)
    
    // Check permissions: global admin, server owner, OR guild leader/officer
    const hasGlobalAdmin = hasResourceAdminAccess(session.user.roles, isOwner)
    
    // Import guild management check
    const { canManageGuildResources } = await import('@/lib/guild-access')
    const canManage = await canManageGuildResources(guildId, session.user.roles, hasGlobalAdmin)
    
    if (!canManage) {
      return NextResponse.json({ error: 'You must be a guild leader or officer to add resources' }, { status: 403 })
    }

    // Verify user has access to this guild's Discord server
    const discordToken = (session as any).accessToken
    if (discordToken) {
      try {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            'Authorization': `Bearer ${discordToken}`,
          },
        })
        
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const userDiscordServers = servers.map((server: any) => server.id)
          
          if (!userDiscordServers.includes(discordServerId)) {
            return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
          }
        }
      } catch (error) {
        console.error('[API POST /api/resources] Error verifying guild access:', error)
        return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
      }
    }

    const newResource = {
      id: nanoid(),
      guildId,
      name,
      quantity: quantity || 0,
      description: description || null,
      category,
      imageUrl: imageUrl || null,
      targetQuantity: targetQuantity || null,
      multiplier: multiplier || 1.0,
      lastUpdatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.insert(resources).values(newResource)

    // Log the creation in history
    await db.insert(resourceHistory).values({
      id: nanoid(),
      resourceId: newResource.id,
      guildId,
      previousQuantity: 0,
      newQuantity: newResource.quantity,
      changeAmount: newResource.quantity,
      changeType: 'absolute',
      updatedBy: userId,
      reason: 'Resource created',
      createdAt: new Date(),
    })

    return NextResponse.json(newResource, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0',
      }
    })
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}

// PUT /api/resources - Update multiple resources or resource metadata
export async function PUT(request: NextRequest) {
  const { getServerSession, authOptions, getUserIdentifier, hasResourceAccess, hasResourceAdminAccess, awardPoints } = await getAuthDependencies()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is super admin - they bypass all permission checks
  const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
  const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

  try {
    const body = await request.json()
    const { resourceUpdates, resourceMetadata } = body
    const userId = getUserIdentifier(session)
    const discordId = session.user.id  // Use Discord ID for leaderboard tracking

    // Handle resource metadata update (admin or guild leader/officer)
    if (resourceMetadata) {
      const { id, name, category, description, imageUrl, multiplier, targetQuantity } = resourceMetadata

      // Verify user has access to the resource's guild and check ownership
      const existingResource = await db.select().from(resources).where(eq(resources.id, id)).limit(1)
      if (existingResource.length === 0 || !existingResource[0].guildId) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      }
      
      const { guilds } = await import('@/lib/db')
      const guild = await db.select().from(guilds).where(eq(guilds.id, existingResource[0].guildId!)).limit(1)
      
      if (guild.length === 0 || !guild[0].discordGuildId) {
        return NextResponse.json({ error: 'Guild not found or not configured' }, { status: 404 })
      }
      
      const discordServerId = guild[0].discordGuildId
      
      // Super admins bypass all permission checks for metadata updates
      if (!isSuperAdmin) {
        // Verify user is in this Discord server
        const discordToken = (session as any).accessToken
        if (discordToken) {
          const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${discordToken}` },
          })
          if (discordResponse.ok) {
            const servers = await discordResponse.json()
            const userDiscordServers = servers.map((server: any) => server.id)
            if (!userDiscordServers.includes(discordServerId)) {
              return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
            }
          }
        }
        
        // Check if user owns THIS specific Discord server
        const { isDiscordServerOwner } = await import('@/lib/discord-roles')
        const isOwner = isDiscordServerOwner(session, discordServerId)
        const hasGlobalAdmin = hasResourceAdminAccess(session.user.roles, isOwner)
        
        // Check guild-specific permissions (leader/officer can edit metadata)
        const { canManageGuildResources } = await import('@/lib/guild-access')
        const canManage = await canManageGuildResources(existingResource[0].guildId!, session.user.roles, hasGlobalAdmin)
        
        if (!canManage) {
          return NextResponse.json({ error: 'You must be a guild leader or officer to edit resource details' }, { status: 403 })
        }
      }

      // Update resource metadata
      const updatedResource = await db.update(resources)
        .set({
          name,
          category,
          description,
          imageUrl,
          multiplier,
          targetQuantity,
          lastUpdatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(resources.id, id))
        .returning()

      return NextResponse.json(updatedResource[0], {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0',
        }
      })
    }

    if (!Array.isArray(resourceUpdates) || resourceUpdates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }
    
    // Verify user has access to all resources being updated
    const resourceIds = resourceUpdates.map(u => u.id)
    const resourcesToUpdate = await db.select().from(resources).where(
      (await import('drizzle-orm')).inArray(resources.id, resourceIds)
    )
    
    if (resourcesToUpdate.length > 0) {
      const { canAccessGuild } = await getAuthDependencies()
      const userRoles = session.user.roles || []
      
      // Super admins bypass all permission checks for quantity updates
      if (!isSuperAdmin) {
        // Check both Discord server membership AND guild-specific role access
        const discordToken = (session as any).accessToken
        if (discordToken) {
          const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${discordToken}` },
          })
          if (discordResponse.ok) {
            const servers = await discordResponse.json()
            const userDiscordServers = servers.map((server: any) => server.id)
            const { guilds } = await import('@/lib/db')
            const { isDiscordServerOwner, hasResourceAccess } = await import('@/lib/discord-roles')
            const guildIds = [...new Set(resourcesToUpdate.map(r => r.guildId).filter((id): id is string => id !== null))]
            const relevantGuilds = await db.select().from(guilds).where(
              (await import('drizzle-orm')).inArray(guilds.id, guildIds)
            )
            
            // First check: User must be in the Discord server
            for (const guild of relevantGuilds) {
              if (!guild.discordGuildId || !userDiscordServers.includes(guild.discordGuildId)) {
                return NextResponse.json({ error: 'Access denied to one or more guilds' }, { status: 403 })
              }
            }
            
            // Second check: User must have resource access permission for THIS server
            for (const guild of relevantGuilds) {
              const discordServerId = guild.discordGuildId!
              const isOwner = isDiscordServerOwner(session, discordServerId)
              
              if (!hasResourceAccess(userRoles, isOwner)) {
                console.log(`[API PUT /api/resources] User ${session.user.name} lacks resource access for Discord server ${discordServerId}`)
                return NextResponse.json({ error: 'You do not have resource access permissions' }, { status: 403 })
              }
            }
            
            // Third check: User must have guild-specific role access (Member/Officer/Leader)
            for (const guild of relevantGuilds) {
              const discordServerId = guild.discordGuildId!
              const isOwner = isDiscordServerOwner(session, discordServerId)
              const hasResourceAdminAccessForServer = session.user.permissions?.hasResourceAdminAccess || false
              const hasGlobalAccess = hasResourceAdminAccessForServer && isOwner
              
              const canAccess = await canAccessGuild(guild.id, userRoles, hasGlobalAccess)
              if (!canAccess) {
                console.log(`[API PUT /api/resources] User ${session.user.name} denied access to guild ${guild.id} - lacks guild membership role`)
                return NextResponse.json({ 
                  error: 'You do not have permission to edit resources for one or more guilds. You must be a member of the guild.' 
                }, { status: 403 })
              }
            }
          }
        }
      }
    }
    
    // Handle quantity updates with points calculation
    const updatePromises = resourceUpdates.map(async (update: { 
      id: string; 
      quantity: number; 
      updateType: 'absolute' | 'relative';
      value: number;
      reason?: string;
    }) => {
      // Get current resource for history logging and points calculation
      const currentResource = await db.select().from(resources).where(eq(resources.id, update.id))
      if (currentResource.length === 0) return null

      const resource = currentResource[0]
      const previousQuantity = resource.quantity
      const changeAmount = update.updateType === 'relative' ? update.value : update.quantity - previousQuantity

      // Update the resource
      await db.update(resources)
        .set({
          quantity: update.quantity,
          lastUpdatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(resources.id, update.id))

      // Log the change in history
      await db.insert(resourceHistory).values({
        id: nanoid(),
        resourceId: update.id,
        guildId: resource.guildId,
        previousQuantity,
        newQuantity: update.quantity,
        changeAmount,
        changeType: update.updateType,
        updatedBy: userId,
        reason: update.reason,
        createdAt: new Date(),
      })

      // Log change for Discord bot polling
      if (changeAmount !== 0) {  // Log both increases and decreases
        await db.insert(websiteChanges).values({
          id: nanoid(),
          changeType: changeAmount > 0 ? 'resource_increase' : 'resource_decrease',
          resourceId: update.id,
          orderId: null,
          previousValue: previousQuantity.toString(),
          newValue: update.quantity.toString(),
          changedBy: userId,
          createdAt: new Date(),
          processedByBot: false,
        })
      }

      // Calculate and award points for eligible actions
      let pointsCalculation = null
      if (changeAmount !== 0) {
        let actionType: 'ADD' | 'SET' | 'REMOVE'
        
        if (update.updateType === 'absolute') {
          actionType = 'SET'
        } else if (changeAmount > 0) {
          actionType = 'ADD'
        } else {
          actionType = 'REMOVE'
        }

        // Calculate status based on the NEW quantity (after update)
        const newStatus = calculateResourceStatus(update.quantity, resource.targetQuantity)

        pointsCalculation = await awardPoints(
          discordId,  // Use Discord ID for consistent tracking across website and Discord bot
          update.id,
          actionType,
          Math.abs(changeAmount),
          {
            name: resource.name,
            category: resource.category || 'Other',
            status: newStatus,
            multiplier: resource.multiplier || 1.0,
            guildId: resource.guildId
          }
        )
      }

      return pointsCalculation
    })

    const pointsResults = await Promise.all(updatePromises)
    const totalPointsEarned = pointsResults
      .filter(result => result !== null)
      .reduce((total, result) => total + (result?.finalPoints || 0), 0)

    // Fetch only the updated resources, not all resources
    const { inArray } = await import('drizzle-orm')
    const updatedResources = await db.select().from(resources).where(
      inArray(resources.id, resourceIds)
    )
    
    return NextResponse.json({
      resources: updatedResources,
      totalPointsEarned,
      pointsBreakdown: pointsResults.filter((result: any) => result !== null)
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0',
      }
    })
  } catch (error) {
    console.error('Error updating resources:', error)
    return NextResponse.json({ error: 'Failed to update resources' }, { status: 500 })
  }
} 