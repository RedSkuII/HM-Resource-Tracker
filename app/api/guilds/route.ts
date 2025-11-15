import { NextRequest, NextResponse } from 'next/server'
import { db, guilds } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's Discord servers to determine which guilds they can access
    const discordToken = (session as any).accessToken
    let userDiscordServers: string[] = []
    
    if (discordToken) {
      try {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            'Authorization': `Bearer ${discordToken}`,
          },
        })
        
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          // Get IDs of all Discord servers the user is a member of
          userDiscordServers = servers.map((server: any) => server.id)
        }
      } catch (error) {
        console.error('[GUILDS API] Error fetching user Discord servers:', error)
      }
    }

    const { searchParams } = new URL(request.url)
    const discordServerId = searchParams.get('discordServerId')
    
    // Fetch in-game guilds, filtered by Discord server ID or user's accessible servers
    let allGuilds
    const { eq, inArray } = await import('drizzle-orm')
    
    if (discordServerId) {
      // Specific Discord server requested - verify user has access
      if (!userDiscordServers.includes(discordServerId)) {
        return NextResponse.json({ error: 'Access denied to this Discord server' }, { status: 403 })
      }
      allGuilds = await db.select().from(guilds).where(eq(guilds.discordGuildId, discordServerId)).all()
    } else {
      // Return only guilds linked to Discord servers the user is a member of
      if (userDiscordServers.length === 0) {
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        })
      }
      
      allGuilds = await db.select().from(guilds).where(inArray(guilds.discordGuildId, userDiscordServers)).all()
    }

    return NextResponse.json(
      allGuilds.map(g => ({
        id: g.id,
        title: g.title,
        maxMembers: g.maxMembers,
        leaderId: g.leaderId,
        discordGuildId: g.discordGuildId
      })),
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    )
  } catch (error) {
    console.error('Error fetching guilds:', error)
    return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 })
  }
}
