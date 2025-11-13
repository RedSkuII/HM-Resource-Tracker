import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'

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

    // Check if user has bot admin access
    const roles = Array.isArray(session.user.roles) ? session.user.roles : []
    if (!hasBotAdminAccess(roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { guildId } = params
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 })
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
