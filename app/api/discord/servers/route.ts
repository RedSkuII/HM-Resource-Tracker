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
    const accessToken = (session as any).accessToken
    
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

    const uniqueServerIds = [...new Set(allGuilds.map(g => g.discordGuildId))]
    
    console.log('[DISCORD SERVERS] Unique server IDs with guilds:', uniqueServerIds)
    console.log('[DISCORD SERVERS] Has access token:', !!accessToken)
    
    // Fetch actual Discord server names from Discord API
    const serverNames: Record<string, string> = {}
    
    if (accessToken) {
      try {
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        
        console.log('[DISCORD SERVERS] Discord API response status:', response.status)
        
        if (response.ok) {
          const discordGuilds = await response.json()
          console.log('[DISCORD SERVERS] Fetched', discordGuilds.length, 'Discord guilds')
          for (const guild of discordGuilds) {
            serverNames[guild.id] = guild.name
          }
          console.log('[DISCORD SERVERS] Server names map:', serverNames)
        } else {
          const errorText = await response.text()
          console.error('[DISCORD SERVERS] Discord API error:', response.status, errorText)
        }
      } catch (error) {
        console.error('[DISCORD SERVERS] Error fetching guild names from Discord:', error)
      }
    } else {
      console.warn('[DISCORD SERVERS] No access token available, using fallback names')
    }
    
    const servers = uniqueServerIds.map(serverId => ({
      id: serverId,
      name: serverNames[serverId] || `Discord Server ${serverId.substring(0, 8)}...`,
    }))

    console.log('[DISCORD SERVERS] Returning servers:', servers)
    
    return NextResponse.json({ servers })
  } catch (error) {
    console.error('Error fetching Discord servers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
