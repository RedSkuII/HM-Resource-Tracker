import { NextRequest, NextResponse } from 'next/server'
import { db, guilds } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccessibleGuilds } from '@/lib/guild-access'

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
          console.log('[GUILDS API] User Discord servers:', userDiscordServers)
        } else {
          console.error('[GUILDS API] Discord API error:', discordResponse.status, await discordResponse.text())
        }
      } catch (error) {
        console.error('[GUILDS API] Error fetching user Discord servers:', error)
      }
    } else {
      console.warn('[GUILDS API] No Discord access token available in session')
    }

    const { searchParams } = new URL(request.url)
    const discordServerId = searchParams.get('discordServerId')
    
    // Get user roles and global access permission
    const userRoles = session.user.roles || []
    const userDiscordId = session.user.id
    const hasGlobalAccess = session.user.permissions?.hasResourceAdminAccess || false
    
    // Fetch in-game guilds, filtered by Discord server ID or user's accessible servers
    let allGuilds
    const { eq, inArray } = await import('drizzle-orm')
    
    if (discordServerId) {
      // Specific Discord server requested - verify user has access
      if (!userDiscordServers.includes(discordServerId)) {
        return NextResponse.json({ error: 'Access denied to this Discord server' }, { status: 403 })
      }
      
      // Check if user is owner/admin of this Discord server
      let isDiscordServerOwner = false
      try {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            'Authorization': `Bearer ${discordToken}`,
          },
        })
        
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const targetServer = servers.find((s: any) => s.id === discordServerId)
          if (targetServer) {
            const ADMINISTRATOR = 0x0000000000000008
            isDiscordServerOwner = targetServer.owner || (BigInt(targetServer.permissions) & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR)
          }
        }
      } catch (err) {
        console.error('[GUILDS API] Error checking Discord server ownership:', err)
      }
      
      // Get accessible guild IDs based on role requirements
      const accessibleGuildIds = await getAccessibleGuilds(discordServerId, userRoles, userDiscordId, isDiscordServerOwner, hasGlobalAccess)
      
      if (accessibleGuildIds.length === 0) {
        console.log('[GUILDS API] User has no accessible guilds in Discord server:', discordServerId)
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        })
      }
      
      // Fetch only the guilds the user has access to
      allGuilds = await db.select().from(guilds).where(inArray(guilds.id, accessibleGuildIds)).all()
    } else {
      // Return only guilds linked to Discord servers the user is a member of
      if (userDiscordServers.length === 0) {
        console.warn('[GUILDS API] No Discord servers found for user, returning empty array')
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        })
      }
      
      console.log('[GUILDS API] Fetching guilds for Discord servers:', userDiscordServers)
      
      // Get all guilds for user's Discord servers
      const allServerGuilds = await db.select().from(guilds).where(inArray(guilds.discordGuildId, userDiscordServers)).all()
      
      // Get Discord server ownership info for all servers
      const serverOwnershipMap = new Map<string, boolean>()
      try {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            'Authorization': `Bearer ${discordToken}`,
          },
        })
        
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const ADMINISTRATOR = 0x0000000000000008
          
          for (const server of servers) {
            const isOwnerOrAdmin = server.owner || (BigInt(server.permissions) & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR)
            serverOwnershipMap.set(server.id, isOwnerOrAdmin)
          }
        }
      } catch (err) {
        console.error('[GUILDS API] Error checking Discord server ownership:', err)
      }
      
      // Filter by role-based access
      const accessibleGuildIds = new Set<string>()
      for (const discordId of userDiscordServers) {
        const isDiscordServerOwner = serverOwnershipMap.get(discordId) || false
        const guildsForServer = await getAccessibleGuilds(discordId, userRoles, userDiscordId, isDiscordServerOwner, hasGlobalAccess)
        guildsForServer.forEach(guildId => accessibleGuildIds.add(guildId))
      }
      
      // Filter the results to only accessible guilds
      allGuilds = allServerGuilds.filter(g => accessibleGuildIds.has(g.id))
      console.log('[GUILDS API] Found accessible guilds:', allGuilds.length)
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
