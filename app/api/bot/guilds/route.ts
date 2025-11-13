import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'
import { db, botConfigurations } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch configured guilds from database
// Note: For full Discord integration, channels/roles would need bot token
// For now, returns guilds that have bot configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has bot admin access
    if (!hasBotAdminAccess(session.user.roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all configured guilds from database
    const configs = await db
      .select({
        guildId: botConfigurations.guildId,
        guildName: botConfigurations.guildName,
        botChannelId: botConfigurations.botChannelId,
        orderChannelId: botConfigurations.orderChannelId,
        updatedAt: botConfigurations.updatedAt
      })
      .from(botConfigurations)
      .orderBy(botConfigurations.updatedAt)

    // Return configured guilds
    // In production, you might want to verify user has access to these guilds
    return NextResponse.json({
      guilds: configs.map(config => ({
        id: config.guildId,
        name: config.guildName || `Guild ${config.guildId}`,
        hasConfiguration: true,
        lastUpdated: config.updatedAt
      }))
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('Error fetching guilds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guilds' },
      { status: 500 }
    )
  }
}
