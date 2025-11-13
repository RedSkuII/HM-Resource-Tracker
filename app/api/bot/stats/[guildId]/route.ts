import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'
import { db, botActivityLogs, discordOrders } from '@/lib/db'
import { eq, and, gte, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// GET - Fetch bot statistics for a guild
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has bot admin access
    const roles = Array.isArray(session.user.roles) ? session.user.roles : []
    if (!hasBotAdminAccess(roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { guildId } = params
    const { searchParams } = new URL(request.url)
    const timeFilter = searchParams.get('timeFilter') || '7d' // Default to 7 days

    // Calculate time cutoff
    let cutoffDate: Date
    const now = new Date()
    
    switch (timeFilter) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        cutoffDate = new Date(0) // Beginning of time
    }

    // Get order statistics
    const orderStats = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`.as('totalOrders'),
        pendingOrders: sql<number>`COUNT(CASE WHEN ${discordOrders.status} = 'pending' THEN 1 END)`.as('pendingOrders'),
        filledOrders: sql<number>`COUNT(CASE WHEN ${discordOrders.status} = 'filled' THEN 1 END)`.as('filledOrders'),
        cancelledOrders: sql<number>`COUNT(CASE WHEN ${discordOrders.status} = 'cancelled' THEN 1 END)`.as('cancelledOrders'),
      })
      .from(discordOrders)
      .where(
        and(
          eq(discordOrders.guildId, guildId),
          gte(discordOrders.createdAt, cutoffDate)
        )
      )

    // Get activity statistics from bot_activity_logs
    const activityStats = await db
      .select({
        totalEvents: sql<number>`COUNT(*)`.as('totalEvents'),
        totalPointsAwarded: sql<number>`COALESCE(SUM(${botActivityLogs.pointsAwarded}), 0)`.as('totalPointsAwarded'),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${botActivityLogs.userId})`.as('uniqueUsers'),
      })
      .from(botActivityLogs)
      .where(
        and(
          eq(botActivityLogs.guildId, guildId),
          gte(botActivityLogs.createdAt, cutoffDate)
        )
      )

    // Get event type breakdown
    const eventBreakdown = await db
      .select({
        eventType: botActivityLogs.eventType,
        count: sql<number>`COUNT(*)`.as('count'),
        totalPoints: sql<number>`COALESCE(SUM(${botActivityLogs.pointsAwarded}), 0)`.as('totalPoints'),
      })
      .from(botActivityLogs)
      .where(
        and(
          eq(botActivityLogs.guildId, guildId),
          gte(botActivityLogs.createdAt, cutoffDate)
        )
      )
      .groupBy(botActivityLogs.eventType)

    // Get top contributors
    const topContributors = await db
      .select({
        userId: botActivityLogs.userId,
        username: botActivityLogs.username,
        totalPoints: sql<number>`COALESCE(SUM(${botActivityLogs.pointsAwarded}), 0)`.as('totalPoints'),
        actionCount: sql<number>`COUNT(*)`.as('actionCount'),
      })
      .from(botActivityLogs)
      .where(
        and(
          eq(botActivityLogs.guildId, guildId),
          gte(botActivityLogs.createdAt, cutoffDate)
        )
      )
      .groupBy(botActivityLogs.userId, botActivityLogs.username)
      .orderBy(sql`totalPoints DESC`)
      .limit(5)

    // Get daily activity trend (last 7 days)
    const dailyTrend = await db
      .select({
        date: sql<string>`DATE(${botActivityLogs.createdAt}, 'unixepoch')`.as('date'),
        events: sql<number>`COUNT(*)`.as('events'),
        points: sql<number>`COALESCE(SUM(${botActivityLogs.pointsAwarded}), 0)`.as('points'),
      })
      .from(botActivityLogs)
      .where(
        and(
          eq(botActivityLogs.guildId, guildId),
          gte(botActivityLogs.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
        )
      )
      .groupBy(sql`date`)
      .orderBy(sql`date ASC`)

    const stats = orderStats[0] || {
      totalOrders: 0,
      pendingOrders: 0,
      filledOrders: 0,
      cancelledOrders: 0
    }

    const activity = activityStats[0] || {
      totalEvents: 0,
      totalPointsAwarded: 0,
      uniqueUsers: 0
    }

    return NextResponse.json({
      orders: stats,
      activity,
      eventBreakdown,
      topContributors,
      dailyTrend,
      timeFilter
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('[BOT-STATS] Error fetching statistics:', error)
    console.error('[BOT-STATS] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch statistics: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
