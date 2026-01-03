import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasResourceAdminAccess } from '@/lib/discord-roles'
import { db, botConfigurations } from '@/lib/db'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// POST - Initialize bot configuration for a guild
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    if (!hasResourceAdminAccess(session.user.roles)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { guildId, guildName } = body

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required' }, { status: 400 })
    }

    // Check if config already exists
    const { eq } = await import('drizzle-orm')
    const existingConfigs = await db
      .select()
      .from(botConfigurations)
      .where(eq(botConfigurations.guildId, guildId))
      .limit(1)

    if (existingConfigs.length > 0) {
      return NextResponse.json({ 
        message: 'Configuration already exists for this guild',
        config: existingConfigs[0]
      })
    }

    // Create default configuration
    const now = new Date()
    const newConfig = {
      id: nanoid(),
      guildId,
      guildName: guildName || 'My Discord Server',
      botChannelId: null,
      orderChannelId: null,
      adminRoleId: null,
      autoUpdateEmbeds: true,
      notifyOnWebsiteChanges: true,
      orderFulfillmentBonus: 0,
      allowPublicOrders: true,
      createdAt: now,
      updatedAt: now
    }

    await db.insert(botConfigurations).values(newConfig)

    return NextResponse.json({
      message: 'Bot configuration created successfully',
      config: newConfig
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating bot configuration:', error)
    return NextResponse.json(
      { error: 'Failed to create bot configuration' },
      { status: 500 }
    )
  }
}
