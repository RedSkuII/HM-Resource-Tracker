import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, guilds } from '@/lib/db'
import { inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userServerIds = session.user.allServerIds || []
    
    if (userServerIds.length === 0) {
      return NextResponse.json({ servers: [] })
    }

    // Get unique Discord server IDs from guilds table
    const allGuilds = await db
      .select({
        discordGuildId: guilds.discordGuildId,
      })
      .from(guilds)
      .where(inArray(guilds.discordGuildId, userServerIds))
      .all()

    // Create a map of server ID to a generic name (we'll use actual names from Discord API if needed)
    const uniqueServerIds = [...new Set(allGuilds.map(g => g.discordGuildId))]
    
    const servers = uniqueServerIds.map(serverId => ({
      id: serverId,
      name: `Discord Server ${serverId.substring(0, 8)}...`, // Fallback name
    }))

    return NextResponse.json({ servers })
  } catch (error) {
    console.error('Error fetching Discord servers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
