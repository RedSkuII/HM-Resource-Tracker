import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, guilds, resources, resourceHistory, leaderboard, discordOrders, resourceDiscordMapping, websiteChanges, botActivityLogs } from '@/lib/db'
import { eq, inArray, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin endpoint to delete orphaned guilds and all related data
 * Only accessible by super admin
 * 
 * POST /api/admin/cleanup-guilds
 * Body: { guildIds: string[] } or { guildTitles: string[] }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super admin can use this endpoint
  const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
  if (!superAdminUserId || session.user.id !== superAdminUserId) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { guildIds, guildTitles } = body

    if (!guildIds && !guildTitles) {
      return NextResponse.json({ error: 'Must provide guildIds or guildTitles array' }, { status: 400 })
    }

    // Find guilds to delete
    let guildsToDelete: { id: string; title: string }[] = []

    if (guildIds && Array.isArray(guildIds)) {
      const found = await db.select({ id: guilds.id, title: guilds.title })
        .from(guilds)
        .where(inArray(guilds.id, guildIds))
      guildsToDelete = found
    } else if (guildTitles && Array.isArray(guildTitles)) {
      const found = await db.select({ id: guilds.id, title: guilds.title })
        .from(guilds)
        .where(inArray(guilds.title, guildTitles))
      guildsToDelete = found
    }

    if (guildsToDelete.length === 0) {
      return NextResponse.json({ 
        message: 'No matching guilds found',
        searched: guildIds || guildTitles
      })
    }

    const guildIdsToDelete = guildsToDelete.map(g => g.id)
    const results: any = {
      guildsDeleted: [],
      resourcesDeleted: 0,
      historyDeleted: 0,
      leaderboardDeleted: 0,
      ordersDeleted: 0,
      mappingsDeleted: 0,
      changesDeleted: 0,
      logsDeleted: 0,
    }

    // Get all resource IDs for these guilds first (needed for FK cleanup)
    const resourcesForGuilds = await db.select({ id: resources.id })
      .from(resources)
      .where(inArray(resources.guildId, guildIdsToDelete))
    const resourceIds = resourcesForGuilds.map(r => r.id)

    console.log(`[ADMIN CLEANUP] Deleting ${guildsToDelete.length} guilds: ${guildsToDelete.map(g => g.title).join(', ')}`)
    console.log(`[ADMIN CLEANUP] Found ${resourceIds.length} resources to clean up`)

    // Delete in order of FK dependencies (children first)
    // ALL tables with FK on resourceId must be cleaned by resourceId
    
    // 1. Delete bot activity logs for these resources
    if (resourceIds.length > 0) {
      try {
        await db.delete(botActivityLogs)
          .where(inArray(botActivityLogs.resourceId, resourceIds))
        results.logsDeleted = resourceIds.length
      } catch (e) { console.log('No activity logs to delete or table missing') }
    }

    // 2. Delete resource discord mappings (FK on resourceId)
    if (resourceIds.length > 0) {
      try {
        await db.delete(resourceDiscordMapping)
          .where(inArray(resourceDiscordMapping.resourceId, resourceIds))
        results.mappingsDeleted = resourceIds.length
      } catch (e) { console.log('No mappings to delete') }
    }

    // 3. Delete website changes for these resources
    if (resourceIds.length > 0) {
      try {
        await db.delete(websiteChanges)
          .where(inArray(websiteChanges.resourceId, resourceIds))
        results.changesDeleted = resourceIds.length
      } catch (e) { console.log('No website changes to delete') }
    }

    // 4. Delete discord orders (FK on resourceId)
    if (resourceIds.length > 0) {
      try {
        await db.delete(discordOrders)
          .where(inArray(discordOrders.resourceId, resourceIds))
        results.ordersDeleted = resourceIds.length
      } catch (e) { console.log('No orders to delete') }
    }

    // 5. Delete resource history (FK on resourceId) - delete by resourceId, not guildId!
    if (resourceIds.length > 0) {
      try {
        await db.delete(resourceHistory)
          .where(inArray(resourceHistory.resourceId, resourceIds))
        results.historyDeleted = resourceIds.length
      } catch (e) { console.log('No history to delete') }
    }

    // 6. Delete leaderboard entries (FK on resourceId) - delete by resourceId, not guildId!
    if (resourceIds.length > 0) {
      try {
        await db.delete(leaderboard)
          .where(inArray(leaderboard.resourceId, resourceIds))
        results.leaderboardDeleted = resourceIds.length
      } catch (e) { console.log('No leaderboard entries to delete') }
    }

    // 7. Delete all resources for these guilds
    if (resourceIds.length > 0) {
      await db.delete(resources)
        .where(inArray(resources.id, resourceIds))
      results.resourcesDeleted = resourceIds.length
    }

    // 8. Finally delete the guilds themselves
    await db.delete(guilds)
      .where(inArray(guilds.id, guildIdsToDelete))
    results.guildsDeleted = guildsToDelete.map(g => g.title)

    console.log(`[ADMIN CLEANUP] Cleanup complete:`, results)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${results.guildsDeleted.length} guilds and all related data`,
      results
    })

  } catch (error) {
    console.error('[ADMIN CLEANUP] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to cleanup guilds', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/cleanup-guilds
 * List all guilds (for admin to see what can be cleaned up)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super admin can use this endpoint
  const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
  if (!superAdminUserId || session.user.id !== superAdminUserId) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const allGuilds = await db.select({
      id: guilds.id,
      title: guilds.title,
      discordGuildId: guilds.discordGuildId,
      createdAt: guilds.createdAt,
    }).from(guilds)

    // Get resource counts per guild
    const resourceCounts = await db.select({
      guildId: resources.guildId,
      count: sql<number>`COUNT(*)`.as('count')
    })
    .from(resources)
    .groupBy(resources.guildId)

    const countsMap = new Map(resourceCounts.map(r => [r.guildId, r.count]))

    const guildsWithCounts = allGuilds.map(g => ({
      ...g,
      resourceCount: countsMap.get(g.id) || 0
    }))

    return NextResponse.json({
      guilds: guildsWithCounts,
      total: allGuilds.length
    })

  } catch (error) {
    console.error('[ADMIN CLEANUP] Error listing guilds:', error)
    return NextResponse.json({ error: 'Failed to list guilds' }, { status: 500 })
  }
}
