import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'
import { db, botConfigurations } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// Helper function to fetch guild name from Discord API
async function fetchGuildNameFromDiscord(guildId: string): Promise<string | null> {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      console.warn('[BOT-CONFIG] No DISCORD_BOT_TOKEN found')
      return null
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    })

    if (response.ok) {
      const guildData = await response.json()
      console.log(`[BOT-CONFIG] Fetched guild name: ${guildData.name}`)
      return guildData.name
    } else {
      console.warn(`[BOT-CONFIG] Failed to fetch guild name: ${response.status}`)
      return null
    }
  } catch (error) {
    console.error('[BOT-CONFIG] Error fetching guild name:', error)
    return null
  }
}

// GET - Fetch bot configuration for a guild
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has bot admin access
    if (!hasBotAdminAccess(session.user.roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { guildId } = params

    // Fetch configuration from database
    const configs = await db
      .select()
      .from(botConfigurations)
      .where(eq(botConfigurations.guildId, guildId))
      .limit(1)

    if (configs.length === 0) {
      // Fetch guild name from Discord API for new configurations
      const fetchedGuildName = await fetchGuildNameFromDiscord(guildId)
      
      // Return default configuration if none exists
      return NextResponse.json({
        guildId,
        guildName: fetchedGuildName,
        inGameGuildId: null,
        botChannelId: [],
        orderChannelId: [],
        adminRoleId: [],
        autoUpdateEmbeds: true,
        notifyOnWebsiteChanges: true,
        orderFulfillmentBonus: 50,
        websiteBonusPercentage: 0,
        allowPublicOrders: true,
        exists: false
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        }
      })
    }

    const config = configs[0]
    
    // If guild name is missing, fetch it and update the database
    let guildName = config.guildName
    if (!guildName) {
      const fetchedGuildName = await fetchGuildNameFromDiscord(guildId)
      if (fetchedGuildName) {
        guildName = fetchedGuildName
        // Update the database with the fetched guild name
        await db
          .update(botConfigurations)
          .set({ guildName: fetchedGuildName, updatedAt: new Date() })
          .where(eq(botConfigurations.guildId, guildId))
        console.log(`[BOT-CONFIG] Updated guild name to: ${fetchedGuildName}`)
      }
    }

    // Parse JSON arrays for multi-select fields
    const parseBotChannelId = () => {
      if (!config.botChannelId) return []
      try {
        return JSON.parse(config.botChannelId)
      } catch {
        // Legacy single value support
        return [config.botChannelId]
      }
    }

    const parseOrderChannelId = () => {
      if (!config.orderChannelId) return []
      try {
        return JSON.parse(config.orderChannelId)
      } catch {
        // Legacy single value support
        return [config.orderChannelId]
      }
    }

    const parseAdminRoleId = () => {
      if (!config.adminRoleId) return []
      try {
        return JSON.parse(config.adminRoleId)
      } catch {
        // Legacy single value support
        return [config.adminRoleId]
      }
    }

    return NextResponse.json({
      id: config.id,
      guildId: config.guildId,
      guildName: guildName,
      inGameGuildId: config.inGameGuildId,
      botChannelId: parseBotChannelId(),
      orderChannelId: parseOrderChannelId(),
      adminRoleId: parseAdminRoleId(),
      autoUpdateEmbeds: config.autoUpdateEmbeds,
      notifyOnWebsiteChanges: config.notifyOnWebsiteChanges,
      orderFulfillmentBonus: config.orderFulfillmentBonus,
      websiteBonusPercentage: config.websiteBonusPercentage,
      allowPublicOrders: config.allowPublicOrders,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      exists: true
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      }
    })

  } catch (error) {
    console.error('Error fetching bot configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bot configuration' },
      { status: 500 }
    )
  }
}

// PUT - Update or create bot configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  let body: any
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has bot admin access
    if (!hasBotAdminAccess(session.user.roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { guildId } = params
    body = await request.json()

    console.log('[BOT-CONFIG] PUT request received:', { guildId, body })

    // Validate required fields
    const {
      guildName,
      inGameGuildId,
      botChannelId,
      orderChannelId,
      adminRoleId,
      autoUpdateEmbeds,
      notifyOnWebsiteChanges,
      orderFulfillmentBonus,
      websiteBonusPercentage,
      allowPublicOrders
    } = body

    // Check if configuration exists
    const existingConfigs = await db
      .select()
      .from(botConfigurations)
      .where(eq(botConfigurations.guildId, guildId))
      .limit(1)

    const now = new Date()

    if (existingConfigs.length === 0) {
      // Create new configuration
      const newConfig = {
        id: nanoid(),
        guildId,
        guildName: guildName || null,
        inGameGuildId: inGameGuildId || null,
        botChannelId: (botChannelId && botChannelId.length > 0) ? JSON.stringify(botChannelId) : null,
        orderChannelId: (orderChannelId && orderChannelId.length > 0) ? JSON.stringify(orderChannelId) : null,
        adminRoleId: (adminRoleId && adminRoleId.length > 0) ? JSON.stringify(adminRoleId) : null,
        autoUpdateEmbeds: autoUpdateEmbeds ?? true,
        notifyOnWebsiteChanges: notifyOnWebsiteChanges ?? true,
        orderFulfillmentBonus: orderFulfillmentBonus ?? 50,
        websiteBonusPercentage: websiteBonusPercentage ?? 0,
        allowPublicOrders: allowPublicOrders ?? true,
        createdAt: now,
        updatedAt: now
      }

      console.log('[BOT-CONFIG] Creating new config:', newConfig)

      try {
        await db.insert(botConfigurations).values(newConfig)
        console.log('[BOT-CONFIG] Config created successfully')
      } catch (dbError) {
        console.error('[BOT-CONFIG] Database insert error:', dbError)
        throw new Error(`Database insert failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      }

      // TODO: Log configuration change to bot_activity_logs
      
      return NextResponse.json({
        message: 'Bot configuration created successfully',
        config: {
          ...newConfig,
          botChannelId: botChannelId || [],
          orderChannelId: orderChannelId || [],
          adminRoleId: adminRoleId || []
        }
      }, {
        status: 201,
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        }
      })
    } else {
      // Update existing configuration
      const updateData: any = {
        updatedAt: now
      }

      if (guildName !== undefined) updateData.guildName = guildName || null
      if (inGameGuildId !== undefined) updateData.inGameGuildId = inGameGuildId || null
      if (botChannelId !== undefined) updateData.botChannelId = (botChannelId && botChannelId.length > 0) ? JSON.stringify(botChannelId) : null
      if (orderChannelId !== undefined) updateData.orderChannelId = (orderChannelId && orderChannelId.length > 0) ? JSON.stringify(orderChannelId) : null
      if (adminRoleId !== undefined) updateData.adminRoleId = (adminRoleId && adminRoleId.length > 0) ? JSON.stringify(adminRoleId) : null
      if (autoUpdateEmbeds !== undefined) updateData.autoUpdateEmbeds = autoUpdateEmbeds
      if (notifyOnWebsiteChanges !== undefined) updateData.notifyOnWebsiteChanges = notifyOnWebsiteChanges
      if (orderFulfillmentBonus !== undefined) updateData.orderFulfillmentBonus = orderFulfillmentBonus
      if (websiteBonusPercentage !== undefined) updateData.websiteBonusPercentage = websiteBonusPercentage
      if (allowPublicOrders !== undefined) updateData.allowPublicOrders = allowPublicOrders

      console.log('[BOT-CONFIG] Updating config with data:', updateData)

      try {
        await db
          .update(botConfigurations)
          .set(updateData)
          .where(eq(botConfigurations.guildId, guildId))
        console.log('[BOT-CONFIG] Config updated successfully')
      } catch (dbError) {
        console.error('[BOT-CONFIG] Database update error:', dbError)
        throw new Error(`Database update failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      }

      // Fetch updated config
      const updatedConfigs = await db
        .select()
        .from(botConfigurations)
        .where(eq(botConfigurations.guildId, guildId))
        .limit(1)

      const updatedConfig = updatedConfigs[0]

      // Parse arrays for response
      const parseBotChannelId = () => {
        if (!updatedConfig.botChannelId) return []
        try {
          return JSON.parse(updatedConfig.botChannelId)
        } catch {
          return [updatedConfig.botChannelId]
        }
      }

      const parseOrderChannelId = () => {
        if (!updatedConfig.orderChannelId) return []
        try {
          return JSON.parse(updatedConfig.orderChannelId)
        } catch {
          return [updatedConfig.orderChannelId]
        }
      }

      const parseAdminRoleId = () => {
        if (!updatedConfig.adminRoleId) return []
        try {
          return JSON.parse(updatedConfig.adminRoleId)
        } catch {
          return [updatedConfig.adminRoleId]
        }
      }

      // TODO: Log configuration change to bot_activity_logs

      return NextResponse.json({
        message: 'Bot configuration updated successfully',
        config: {
          ...updatedConfig,
          botChannelId: parseBotChannelId(),
          orderChannelId: parseOrderChannelId(),
          adminRoleId: parseAdminRoleId()
        }
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        }
      })
    }

  } catch (error) {
    console.error('[BOT-CONFIG] Error updating bot configuration:', error)
    console.error('[BOT-CONFIG] Error details:', error instanceof Error ? error.message : String(error))
    console.error('[BOT-CONFIG] Request body:', body)
    return NextResponse.json(
      { 
        error: 'Failed to update bot configuration',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
