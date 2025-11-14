import { NextRequest, NextResponse } from 'next/server'
import { db, resources, resourceHistory, websiteChanges } from '@/lib/db'
import { eq } from 'drizzle-orm'
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
  return { getServerSession, authOptions, getUserIdentifier, hasResourceAccess, hasResourceAdminAccess, awardPoints }
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
    console.log('[API /api/resources] Starting GET request')
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    console.log('[API /api/resources] guildId:', guildId)
    
    const startTime = Date.now()
    
    // TEMPORARILY: Fetch ALL resources without filtering to test if WHERE clause is the issue
    console.log('[API /api/resources] Fetching ALL resources (no filter)')
    const allResources = await db.select().from(resources)
    
    // Filter client-side for now
    const filteredResources = guildId 
      ? allResources.filter(r => r.guildId === guildId)
      : allResources
    
    const queryTime = Date.now() - startTime
    console.log(`[API /api/resources] Query completed in ${queryTime}ms, found ${allResources.length} total, ${filteredResources.length} for guild`)
    
    // Return resources without any transformation to avoid serialization issues
    return NextResponse.json(filteredResources, {
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

// POST /api/resources - Create new resource (admin only)
export async function POST(request: NextRequest) {
  const { getServerSession, authOptions, getUserIdentifier, hasResourceAdminAccess } = await getAuthDependencies()
  const session = await getServerSession(authOptions)

  if (!session || !hasResourceAdminAccess(session.user.roles)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
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

  if (!session || !hasResourceAccess(session.user.roles)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { resourceUpdates, resourceMetadata } = body
    const userId = getUserIdentifier(session)
    const discordId = session.user.id  // Use Discord ID for leaderboard tracking

    // Handle resource metadata update (admin only)
    if (resourceMetadata) {
      if (!hasResourceAdminAccess(session.user.roles)) {
        return NextResponse.json({ error: 'Admin access required for metadata updates' }, { status: 403 })
      }

      const { id, name, category, description, imageUrl, multiplier } = resourceMetadata

      // Update resource metadata
      const updatedResource = await db.update(resources)
        .set({
          name,
          category,
          description,
          imageUrl,
          multiplier,
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

      // Log change for Discord bot polling (only for additions to sync with orders)
      if (changeAmount > 0) {
        await db.insert(websiteChanges).values({
          id: nanoid(),
          changeType: 'resource_update',
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

    const updatedResources = await db.select().from(resources)
    
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