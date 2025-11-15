import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { botActivityLogs } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

// GET /api/bot/activity/[guildId] - Get bot activity logs for a Discord server
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guildId } = params
    
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 })
    }

    // Fetch activity logs for this Discord server, ordered by most recent
    const activityLogs = await db
      .select()
      .from(botActivityLogs)
      .where(eq(botActivityLogs.guildId, guildId))
      .orderBy(desc(botActivityLogs.createdAt))
      .limit(100) // Limit to last 100 activities

    // Parse details JSON if present
    const formattedLogs = activityLogs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }))

    return NextResponse.json(formattedLogs, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching bot activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}
