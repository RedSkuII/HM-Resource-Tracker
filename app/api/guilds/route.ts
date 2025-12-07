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

    // Use Discord servers from session (already fetched during login) to avoid rate limits
    const userDiscordServers = session.user.allServerIds || []
    console.log('[GUILDS API] User Discord servers from session:', userDiscordServers.length, userDiscordServers)
    console.log('[GUILDS API] Session user data:', {
      id: session.user.id,
      name: session.user.name,
      hasAllServerIds: !!session.user.allServerIds,
      hasOwnedServerIds: !!session.user.ownedServerIds,
      allServerIdsCount: session.user.allServerIds?.length || 0,
      ownedServerIdsCount: session.user.ownedServerIds?.length || 0
    })

    const { searchParams } = new URL(request.url)
    const discordServerId = searchParams.get('discordServerId')
    const discordToken = (session as any).accessToken
    
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
      
      // Check if user is owner/admin of this Discord server (use session data to avoid rate limits)
      const isDiscordServerOwner = session.user.ownedServerIds?.includes(discordServerId) || false
      console.log('[GUILDS API] Discord server ownership check:', { discordServerId, isDiscordServerOwner })
      
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
      
      // Use server ownership from session to avoid rate limits
      const ownedServerIds = session.user.ownedServerIds || []
      console.log('[GUILDS API] User owned servers from session:', ownedServerIds.length)
      
      // Filter by role-based access
      const accessibleGuildIds = new Set<string>()
      for (const discordId of userDiscordServers) {
        const isDiscordServerOwner = ownedServerIds.includes(discordId)
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
