import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'
import { db, botConfigurations, discordOrders } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// GET - Fetch guilds from database (both configured and active via orders)
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

    // Fetch all configured guilds
    const configs = await db
      .select({
        guildId: botConfigurations.guildId,
        guildName: botConfigurations.guildName,
        updatedAt: botConfigurations.updatedAt
      })
      .from(botConfigurations)

    // Also fetch guilds from discord_orders that don't have configurations yet
    const activeGuilds = await db
      .select({
        guildId: discordOrders.guildId,
      })
      .from(discordOrders)
      .groupBy(discordOrders.guildId)

    // Merge and deduplicate
    const configGuildIds = new Set(configs.map(c => c.guildId))
    const allGuilds = [
      ...configs.map(config => ({
        id: config.guildId,
        name: config.guildName || `Guild ${config.guildId}`,
        hasConfiguration: true,
        lastUpdated: config.updatedAt
      })),
      ...activeGuilds
        .filter(g => !configGuildIds.has(g.guildId))
        .map(guild => ({
          id: guild.guildId,
          name: `Guild ${guild.guildId}`,
          hasConfiguration: false,
          lastUpdated: undefined
        }))
    ]

    return NextResponse.json({
      guilds: allGuilds
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
