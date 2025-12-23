import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserContributions, getUserRank } from '@/lib/leaderboard'
import { getAccessibleGuildsForUser } from '@/lib/guild-access'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const timeFilter = searchParams.get('timeFilter') as '24h' | '7d' | '30d' | 'all' || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize
    const effectiveLimit = searchParams.get('limit') ? limit : pageSize

    // SECURITY: Get accessible guilds to prevent cross-guild data leakage
    const accessibleGuildIds = await getAccessibleGuildsForUser(session)
    
    if (accessibleGuildIds.length === 0) {
      return NextResponse.json({
        userId: params.userId,
        userName: null,
        timeFilter,
        rank: null,
        contributions: [],
        summary: { totalPoints: 0, totalActions: 0 },
        total: 0,
        page,
        pageSize: effectiveLimit,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      })
    }

    const [contributions, rank] = await Promise.all([
      getUserContributions(params.userId, timeFilter, effectiveLimit, offset, accessibleGuildIds),
      getUserRank(params.userId, timeFilter, accessibleGuildIds)
    ])

    return NextResponse.json({
      userId: params.userId,
      userName: contributions.userName,
      timeFilter,
      rank,
      contributions: contributions.contributions,
      summary: contributions.summary,
      total: contributions.total,
      page,
      pageSize: effectiveLimit,
      totalPages: Math.ceil(contributions.total / effectiveLimit),
      hasNextPage: offset + effectiveLimit < contributions.total,
      hasPrevPage: page > 1
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching user contributions:', error)
    return NextResponse.json({ error: 'Failed to fetch user contributions' }, { status: 500 })
  }
} 