import { NextRequest, NextResponse } from 'next/server'
import { db, guilds } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Fetch all in-game guilds (public endpoint - no auth required)
    const allGuilds = await db.select().from(guilds).all()

    return NextResponse.json(
      allGuilds.map(g => ({
        id: g.id,
        title: g.title,
        maxMembers: g.maxMembers,
        leaderId: g.leaderId
      })),
      {
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        }
      }
    )
  } catch (error) {
    console.error('Error fetching guilds:', error)
    return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 })
  }
}
