import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeaderboard } from '@/lib/leaderboard'
import { getAccessibleGuildsForUser } from '@/lib/guild-access'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    const timeFilter = searchParams.get('timeFilter') as '24h' | '7d' | '30d' | 'all' || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize
    const effectiveLimit = searchParams.get('limit') ? limit : pageSize

    // Get accessible guilds for user (SECURITY: prevent cross-guild data leakage)
    const accessibleGuildIds = await getAccessibleGuildsForUser(session)
    
    if (accessibleGuildIds.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        timeFilter,
        total: 0,
        page,
        pageSize: effectiveLimit,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      })
    }
    
    // If specific guild requested, verify access
    let targetGuildIds: string[]
    if (guildId && guildId !== 'all') {
      if (!accessibleGuildIds.includes(guildId)) {
        return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
      }
      targetGuildIds = [guildId]
    } else {
      // "All" means all guilds the user has access to, NOT all guilds in the system
      targetGuildIds = accessibleGuildIds
    }

    const result = await getLeaderboard(timeFilter, effectiveLimit, offset, targetGuildIds)

    return NextResponse.json({
      leaderboard: result.rankings,
      timeFilter,
      total: result.total,
      page,
      pageSize: effectiveLimit,
      totalPages: Math.ceil(result.total / effectiveLimit),
      hasNextPage: offset + effectiveLimit < result.total,
      hasPrevPage: page > 1
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
} 