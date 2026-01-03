import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGuildsWithBotAdminAccess } from '@/lib/guild-access'

export const dynamic = 'force-dynamic'

// GET - Fetch Discord guild channels and roles
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guildId } = params
    const botToken = process.env.DISCORD_BOT_TOKEN
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID

    if (!botToken) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 })
    }

    // Check if user is the super admin (global access to everything)
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId
    
    if (isSuperAdmin) {
      console.log('[DISCORD-GUILD] Super admin access granted:', session.user.id)
    } else {
      // Check if user is owner OR has Discord ADMINISTRATOR permission for this server
      // Use session data to avoid rate limits
      const isServerOwner = session.user.ownedServerIds?.includes(guildId) || false
      const isDiscordAdmin = session.user.adminServerIds?.includes(guildId) || false
      const isServerOwnerOrAdmin = isServerOwner || isDiscordAdmin
      
      console.log('[DISCORD-GUILD] Session-based permission check:', {
        guildId,
        userId: session.user.id,
        isServerOwner,
        isDiscordAdmin,
        isServerOwnerOrAdmin
      })
      
      // Non-super admins MUST be owner/admin of THIS specific server OR have guild admin role
      if (!isServerOwnerOrAdmin) {
        // Check if user has admin role for any in-game guild on this Discord server
        const userRolesForServer = session.user.serverRolesMap?.[guildId] || []
        const guildsWithAdminAccess = await getGuildsWithBotAdminAccess(guildId, userRolesForServer)
        
        if (guildsWithAdminAccess.length > 0) {
          console.log('[DISCORD-GUILD] Access granted via guild admin role:', { 
            guildId, 
            userId: session.user.id,
            guildsWithAccess: guildsWithAdminAccess
          })
        } else {
          console.log('[DISCORD-GUILD] Access denied - not owner/admin and no guild admin role:', { 
            guildId, 
            userId: session.user.id,
            userName: session.user.name
          })
          return NextResponse.json({ 
            error: 'You must be an owner, administrator, or have a guild admin role to access this configuration.' 
          }, { status: 403 })
        }
      }
    }

    // Fetch channels
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    })

    if (!channelsResponse.ok) {
      throw new Error(`Failed to fetch channels: ${channelsResponse.status}`)
    }

    const allChannels = await channelsResponse.json()
    
    // Filter for text channels only (type 0 = GUILD_TEXT)
    const textChannels = allChannels
      .filter((channel: any) => channel.type === 0)
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        position: channel.position
      }))
      .sort((a: any, b: any) => a.position - b.position)

    // Fetch roles
    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    })

    if (!rolesResponse.ok) {
      throw new Error(`Failed to fetch roles: ${rolesResponse.status}`)
    }

    const allRoles = await rolesResponse.json()
    
    // Sort roles by position (higher position = higher in hierarchy)
    const sortedRoles = allRoles
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color
      }))
      .sort((a: any, b: any) => b.position - a.position)
      .filter((role: any) => role.name !== '@everyone') // Exclude @everyone role

    return NextResponse.json({
      channels: textChannels,
      roles: sortedRoles
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('[DISCORD-GUILD] Error fetching guild data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Discord guild data: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
