import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'
import { db, guilds } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// GET - Fetch guild configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guildId } = params
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID

    // Fetch guild to get its Discord server ID
    const [guild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Check if user is the super admin (global access)
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId
    
    if (!isSuperAdmin) {
      // Non-super admins can ONLY access guilds from servers they own/administrate
      const discordServerId = guild.discordGuildId
      
      if (!discordServerId) {
        return NextResponse.json({ error: 'Guild has no associated Discord server' }, { status: 400 })
      }
      
      // Check if user is owner/admin of this guild's Discord server
      let isServerOwnerOrAdmin = false
      
      if ((session as any).accessToken) {
        try {
          const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
              'Authorization': `Bearer ${(session as any).accessToken}`,
            },
          })
          
          if (guildsResponse.ok) {
            const userGuilds = await guildsResponse.json()
            const targetGuild = userGuilds.find((g: any) => g.id === discordServerId)
            
            if (targetGuild) {
              const ADMINISTRATOR = 0x0000000000000008
              isServerOwnerOrAdmin = targetGuild.owner || (BigInt(targetGuild.permissions) & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR)
            }
          }
        } catch (err) {
          console.error('[GUILD-CONFIG] Error checking server ownership:', err)
        }
      }
      
      if (!isServerOwnerOrAdmin) {
        console.log('[GUILD-CONFIG] Access denied - not owner/admin of guild\'s Discord server:', {
          guildId,
          discordServerId,
          userId: session.user.id
        })
        return NextResponse.json({ 
          error: 'You must be an owner or administrator of this guild\'s Discord server.' 
        }, { status: 403 })
      }
    }

    // Parse JSON arrays
    const parseBotChannelId = () => {
      if (!guild.botChannelId) return []
      try {
        return JSON.parse(guild.botChannelId)
      } catch {
        return [guild.botChannelId]
      }
    }

    const parseOrderChannelId = () => {
      if (!guild.orderChannelId) return []
      try {
        return JSON.parse(guild.orderChannelId)
      } catch {
        return [guild.orderChannelId]
      }
    }

    const parseAdminRoleId = () => {
      if (!guild.adminRoleId) return []
      try {
        return JSON.parse(guild.adminRoleId)
      } catch {
        return [guild.adminRoleId]
      }
    }

    return NextResponse.json({
      id: guild.id,
      discordGuildId: guild.discordGuildId,
      title: guild.title,
      botChannelId: parseBotChannelId(),
      orderChannelId: parseOrderChannelId(),
      adminRoleId: parseAdminRoleId(),
      autoUpdateEmbeds: guild.autoUpdateEmbeds,
      notifyOnWebsiteChanges: guild.notifyOnWebsiteChanges,
      orderFulfillmentBonus: guild.orderFulfillmentBonus,
      websiteBonusPercentage: guild.websiteBonusPercentage,
      allowPublicOrders: guild.allowPublicOrders,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('Error fetching guild configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guild configuration' },
      { status: 500 }
    )
  }
}

// PUT - Update guild configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guildId } = params
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID

    // Fetch guild to get its Discord server ID
    const [guild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Check if user is the super admin (global access)
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId
    
    if (!isSuperAdmin) {
      // Non-super admins can ONLY modify guilds from servers they own/administrate
      const discordServerId = guild.discordGuildId
      
      if (!discordServerId) {
        return NextResponse.json({ error: 'Guild has no associated Discord server' }, { status: 400 })
      }
      
      // Check if user is owner/admin of this guild's Discord server
      let isServerOwnerOrAdmin = false
      
      if ((session as any).accessToken) {
        try {
          const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
              'Authorization': `Bearer ${(session as any).accessToken}`,
            },
          })
          
          if (guildsResponse.ok) {
            const userGuilds = await guildsResponse.json()
            const targetGuild = userGuilds.find((g: any) => g.id === discordServerId)
            
            if (targetGuild) {
              const ADMINISTRATOR = 0x0000000000000008
              isServerOwnerOrAdmin = targetGuild.owner || (BigInt(targetGuild.permissions) & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR)
            }
          }
        } catch (err) {
          console.error('[GUILD-CONFIG] Error checking server ownership:', err)
        }
      }
      
      if (!isServerOwnerOrAdmin) {
        console.log('[GUILD-CONFIG] PUT access denied - not owner/admin of guild\'s Discord server:', {
          guildId,
          discordServerId,
          userId: session.user.id
        })
        return NextResponse.json({ 
          error: 'You must be an owner or administrator of this guild\'s Discord server.' 
        }, { status: 403 })
      }
    }

    const body = await request.json()

    console.log('[GUILD-CONFIG] PUT request received:', { guildId, body })

    const {
      botChannelId,
      orderChannelId,
      adminRoleId,
      autoUpdateEmbeds,
      notifyOnWebsiteChanges,
      orderFulfillmentBonus,
      websiteBonusPercentage,
      allowPublicOrders
    } = body

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (botChannelId !== undefined) {
      updateData.botChannelId = (botChannelId && botChannelId.length > 0) 
        ? JSON.stringify(botChannelId) 
        : null
    }
    if (orderChannelId !== undefined) {
      updateData.orderChannelId = (orderChannelId && orderChannelId.length > 0) 
        ? JSON.stringify(orderChannelId) 
        : null
    }
    if (adminRoleId !== undefined) {
      updateData.adminRoleId = (adminRoleId && adminRoleId.length > 0) 
        ? JSON.stringify(adminRoleId) 
        : null
    }
    if (autoUpdateEmbeds !== undefined) updateData.autoUpdateEmbeds = autoUpdateEmbeds
    if (notifyOnWebsiteChanges !== undefined) updateData.notifyOnWebsiteChanges = notifyOnWebsiteChanges
    if (orderFulfillmentBonus !== undefined) updateData.orderFulfillmentBonus = orderFulfillmentBonus
    if (websiteBonusPercentage !== undefined) updateData.websiteBonusPercentage = websiteBonusPercentage
    if (allowPublicOrders !== undefined) updateData.allowPublicOrders = allowPublicOrders

    console.log('[GUILD-CONFIG] Updating guild with data:', updateData)

    await db
      .update(guilds)
      .set(updateData)
      .where(eq(guilds.id, guildId))

    console.log('[GUILD-CONFIG] Guild config updated successfully')

    // Fetch updated guild
    const [updatedGuild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    // Parse arrays for response
    const parseBotChannelId = () => {
      if (!updatedGuild.botChannelId) return []
      try {
        return JSON.parse(updatedGuild.botChannelId)
      } catch {
        return [updatedGuild.botChannelId]
      }
    }

    const parseOrderChannelId = () => {
      if (!updatedGuild.orderChannelId) return []
      try {
        return JSON.parse(updatedGuild.orderChannelId)
      } catch {
        return [updatedGuild.orderChannelId]
      }
    }

    const parseAdminRoleId = () => {
      if (!updatedGuild.adminRoleId) return []
      try {
        return JSON.parse(updatedGuild.adminRoleId)
      } catch {
        return [updatedGuild.adminRoleId]
      }
    }

    return NextResponse.json({
      message: 'Guild configuration updated successfully',
      config: {
        ...updatedGuild,
        botChannelId: parseBotChannelId(),
        orderChannelId: parseOrderChannelId(),
        adminRoleId: parseAdminRoleId()
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('[GUILD-CONFIG] Error updating guild configuration:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update guild configuration',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
