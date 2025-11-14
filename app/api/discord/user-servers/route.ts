import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

// GET - Fetch Discord servers where user is owner or has administrator permission
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

    const guilds: DiscordGuild[] = await response.json()

    // Filter to only guilds where user is owner or has administrator permission
    const adminGuilds = guilds.filter(guild => {
      // Owner always has full access
      if (guild.owner) return true
      
      // Check if user has ADMINISTRATOR permission
      const permissions = BigInt(guild.permissions)
      const hasAdmin = (permissions & BigInt(ADMINISTRATOR_PERMISSION)) === BigInt(ADMINISTRATOR_PERMISSION)
      
      return hasAdmin
    })

    return NextResponse.json({
      servers: adminGuilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        isOwner: guild.owner
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
