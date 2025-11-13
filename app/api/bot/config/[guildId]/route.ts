import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasBotAdminAccess } from '@/lib/discord-roles'
import { db, botConfigurations } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

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
      // Return default configuration if none exists
      return NextResponse.json({
        guildId,
        guildName: null,
        botChannelId: null,
        orderChannelId: null,
        adminRoleId: null,
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

    return NextResponse.json({
      id: config.id,
      guildId: config.guildId,
      guildName: config.guildName,
      botChannelId: config.botChannelId,
      orderChannelId: config.orderChannelId,
      adminRoleId: config.adminRoleId,
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
    const body = await request.json()

    // Validate required fields
    const {
      guildName,
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
        botChannelId: botChannelId || null,
        orderChannelId: orderChannelId || null,
        adminRoleId: adminRoleId || null,
        autoUpdateEmbeds: autoUpdateEmbeds ?? true,
        notifyOnWebsiteChanges: notifyOnWebsiteChanges ?? true,
        orderFulfillmentBonus: orderFulfillmentBonus ?? 50,
        websiteBonusPercentage: websiteBonusPercentage ?? 0,
        allowPublicOrders: allowPublicOrders ?? true,
        createdAt: now,
        updatedAt: now
      }

      await db.insert(botConfigurations).values(newConfig)

      // TODO: Log configuration change to bot_activity_logs
      
      return NextResponse.json({
        message: 'Bot configuration created successfully',
        config: newConfig
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
      if (botChannelId !== undefined) updateData.botChannelId = botChannelId || null
      if (orderChannelId !== undefined) updateData.orderChannelId = orderChannelId || null
      if (adminRoleId !== undefined) updateData.adminRoleId = adminRoleId || null
      if (autoUpdateEmbeds !== undefined) updateData.autoUpdateEmbeds = autoUpdateEmbeds
      if (notifyOnWebsiteChanges !== undefined) updateData.notifyOnWebsiteChanges = notifyOnWebsiteChanges
      if (orderFulfillmentBonus !== undefined) updateData.orderFulfillmentBonus = orderFulfillmentBonus
      if (websiteBonusPercentage !== undefined) updateData.websiteBonusPercentage = websiteBonusPercentage
      if (allowPublicOrders !== undefined) updateData.allowPublicOrders = allowPublicOrders

      await db
        .update(botConfigurations)
        .set(updateData)
        .where(eq(botConfigurations.guildId, guildId))

      // Fetch updated config
      const updatedConfigs = await db
        .select()
        .from(botConfigurations)
        .where(eq(botConfigurations.guildId, guildId))
        .limit(1)

      // TODO: Log configuration change to bot_activity_logs

      return NextResponse.json({
        message: 'Bot configuration updated successfully',
        config: updatedConfigs[0]
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        }
      })
    }

  } catch (error) {
    console.error('Error updating bot configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update bot configuration' },
      { status: 500 }
    )
  }
}
