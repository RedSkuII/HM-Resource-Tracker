import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const guildId = params.guildId
    const discordToken = (session as any).accessToken

    if (!discordToken) {
      return NextResponse.json({ error: 'No Discord access token available' }, { status: 401 })
    }

    // Check if user is a member of this Discord server
    const userServers = session.user.allServerIds || []
    if (!userServers.includes(guildId)) {
      return NextResponse.json({ error: 'You are not a member of this Discord server' }, { status: 403 })
    }

    // Fetch roles from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch roles for guild ${guildId}:`, response.status, await response.text())
      return NextResponse.json({ error: 'Failed to fetch Discord roles' }, { status: response.status })
    }

    const roles = await response.json()

    return NextResponse.json({
      roles: roles.map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions
      }))
    })
  } catch (error) {
    console.error('Error fetching Discord roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
