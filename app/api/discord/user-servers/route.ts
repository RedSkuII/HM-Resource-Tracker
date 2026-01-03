import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, guilds } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Discord permissions - ADMINISTRATOR flag
const ADMINISTRATOR_PERMISSION = 0x0000000000000008

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

// GET - Fetch Discord servers where user is owner, has administrator permission, or has guild-specific bot admin role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's Discord guilds using their access token
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No Discord access token available' }, { status: 401 })
    }

    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('[USER-SERVERS] Discord API error:', response.status, response.statusText)
      return NextResponse.json({ error: 'Failed to fetch Discord servers' }, { status: response.status })
    }

    const allDiscordGuilds: DiscordGuild[] = await response.json()
    
    // Get user's roles from session (aggregated across all servers)
    const userRoles = session.user.roles || []
    const serverRolesMap = (session.user as any).serverRolesMap || {}

    // Check each Discord server for access
    const accessibleGuilds: (DiscordGuild & { hasGuildAdminAccess?: boolean })[] = []
    
    for (const guild of allDiscordGuilds) {
      // Owner always has full access
      if (guild.owner) {
        console.log(`[USER-SERVERS] ${guild.name}: User is owner`)
        accessibleGuilds.push(guild)
        continue
      }
      
      // Check if user has ADMINISTRATOR permission on Discord server
      const permissions = BigInt(guild.permissions)
      const hasAdmin = (permissions & BigInt(ADMINISTRATOR_PERMISSION)) === BigInt(ADMINISTRATOR_PERMISSION)
      
      console.log(`[USER-SERVERS] ${guild.name}: permissions=${guild.permissions}, hasAdmin=${hasAdmin}`)
      
      if (hasAdmin) {
        console.log(`[USER-SERVERS] ${guild.name}: User has ADMINISTRATOR permission`)
        accessibleGuilds.push(guild)
        continue
      }
      
      // Check if user has guild-specific bot admin access for any in-game guild on this Discord server
      // Get roles for THIS specific Discord server
      const userRolesForServer = serverRolesMap[guild.id] || []
      
      if (userRolesForServer.length > 0) {
        // Check if any in-game guild on this Discord server has this user as admin
        const inGameGuildsOnServer = await db
          .select()
          .from(guilds)
          .where(eq(guilds.discordGuildId, guild.id))
        
        for (const inGameGuild of inGameGuildsOnServer) {
          // Check adminRoleId (bot admin roles)
          if (inGameGuild.adminRoleId) {
            let adminRoles: string[] = []
            try {
              adminRoles = JSON.parse(inGameGuild.adminRoleId)
            } catch {
              adminRoles = [inGameGuild.adminRoleId]
            }
            
            if (adminRoles.some(roleId => userRolesForServer.includes(roleId))) {
              console.log(`[USER-SERVERS] User has bot admin access via guild "${inGameGuild.title}"`)
              accessibleGuilds.push({ ...guild, hasGuildAdminAccess: true })
              break // Found access, no need to check more guilds
            }
          }
        }
      }
    }

    return NextResponse.json({
      servers: accessibleGuilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        isOwner: guild.owner,
        hasGuildAdminAccess: (guild as any).hasGuildAdminAccess || false
      }))
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('[USER-SERVERS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user servers' },
      { status: 500 }
    )
  }
}
