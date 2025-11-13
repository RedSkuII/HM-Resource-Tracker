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
    
    console.log('[BOT-GUILDS] Session:', session ? 'exists' : 'null')
    console.log('[BOT-GUILDS] User:', session?.user)
    console.log('[BOT-GUILDS] User roles:', session?.user?.roles)
    
    if (!session || !session.user) {
      console.error('[BOT-GUILDS] No session or user found')
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }

    // Check if user has bot admin access
    const roles = Array.isArray(session.user.roles) ? session.user.roles : []
    console.log('[BOT-GUILDS] Checking permissions with roles:', roles)
    
    const hasAccess = hasBotAdminAccess(roles)
    console.log('[BOT-GUILDS] Has bot admin access:', hasAccess)
    
    if (!hasAccess) {
      console.error('[BOT-GUILDS] Insufficient permissions for user')
      return NextResponse.json({ error: 'Insufficient permissions - Admin access required' }, { status: 403 })
    }

    console.log('[BOT-GUILDS] Fetching guilds from database...')

    // Fetch all configured guilds
    const configs = await db
      .select({
        guildId: botConfigurations.guildId,
        guildName: botConfigurations.guildName,
        updatedAt: botConfigurations.updatedAt
      })
      .from(botConfigurations)

    console.log('[BOT-GUILDS] Found', configs.length, 'configured guilds')

    // Also fetch guilds from discord_orders that don't have configurations yet
    const activeGuilds = await db
      .select({
        guildId: discordOrders.guildId,
      })
      .from(discordOrders)
      .groupBy(discordOrders.guildId)

    console.log('[BOT-GUILDS] Found', activeGuilds.length, 'active guilds from orders')

    // Helper function to fetch guild name from Discord API
    async function fetchGuildName(guildId: string): Promise<string | null> {
      try {
        const botToken = process.env.DISCORD_BOT_TOKEN
        if (!botToken) {
          console.warn('[BOT-GUILDS] No DISCORD_BOT_TOKEN found, cannot fetch guild names')
          return null
        }

        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: {
            'Authorization': `Bot ${botToken}`,
          },
        })

        if (response.ok) {
          const guildData = await response.json()
          return guildData.name
        } else {
          console.warn(`[BOT-GUILDS] Failed to fetch guild name for ${guildId}: ${response.status}`)
          return null
        }
      } catch (error) {
        console.error(`[BOT-GUILDS] Error fetching guild name for ${guildId}:`, error)
        return null
      }
    }

    // Merge and deduplicate
    const configGuildIds = new Set(configs.map(c => c.guildId))
    
    // For guilds without a stored name, fetch from Discord API
    const guildsWithNames = await Promise.all([
      ...configs.map(async config => {
        let name = config.guildName
        
        // If no name stored, try to fetch from Discord
        if (!name) {
          const fetchedName = await fetchGuildName(config.guildId)
          name = fetchedName || `Guild ${config.guildId}`
        }
        
        return {
          id: config.guildId,
          name,
          hasConfiguration: true,
          lastUpdated: config.updatedAt
        }
      }),
      ...activeGuilds
        .filter(g => !configGuildIds.has(g.guildId))
        .map(async guild => {
          const fetchedName = await fetchGuildName(guild.guildId)
          
          return {
            id: guild.guildId,
            name: fetchedName || `Guild ${guild.guildId}`,
            hasConfiguration: false,
            lastUpdated: undefined
          }
        })
    ])

    const allGuilds = guildsWithNames

    console.log('[BOT-GUILDS] Returning', allGuilds.length, 'total guilds')

    return NextResponse.json({
      guilds: allGuilds
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('[BOT-GUILDS] Error fetching guilds:', error)
    console.error('[BOT-GUILDS] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch guilds: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
