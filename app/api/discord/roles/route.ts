import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDiscordRoleNames } from '@/lib/discord-api'

// GET /api/discord/roles - Fetch Discord role names for user's roles
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user.roles) {
    return NextResponse.json({ error: 'Not authenticated or no roles found' }, { status: 401 })
  }

  try {
    const guildId = process.env.DISCORD_GUILD_ID!
    const roleNames = await getDiscordRoleNames(session.user.roles, guildId)
    
    return NextResponse.json({ roleNames }, {
      headers: {
        'Cache-Control': 'max-age=300', // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error('Error fetching Discord role names:', error)
    return NextResponse.json({ error: 'Failed to fetch role names' }, { status: 500 })
  }
}