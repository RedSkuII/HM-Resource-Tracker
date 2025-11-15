import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, guilds } from '@/lib/db'
import { eq } from 'drizzle-orm'

/**
 * PUT /api/guilds/[guildId]/roles
 * Update the Discord role requirements for accessing a specific in-game guild
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is authenticated and has admin access
    if (!session || !session.user.permissions?.hasResourceAdminAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { guildId } = params
    const body = await request.json()
    const { roleIds } = body

    // Validate input
    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: 'roleIds must be an array of Discord role IDs' },
        { status: 400 }
      )
    }

    // Check if guild exists
    const existingGuild = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (existingGuild.length === 0) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      )
    }

    // Update the guild access roles
    const rolesJson = roleIds.length > 0 ? JSON.stringify(roleIds) : null
    const currentTime = Math.floor(Date.now() / 1000)

    await db
      .update(guilds)
      .set({
        guildAccessRoles: rolesJson,
        updatedAt: new Date(currentTime * 1000)
      })
      .where(eq(guilds.id, guildId))

    console.log(`[GUILD-ROLES] Updated access roles for guild ${guildId}:`, roleIds)

    return NextResponse.json({
      success: true,
      guildId,
      roleIds,
      message: `Updated access roles for ${existingGuild[0].title}`
    })

  } catch (error) {
    console.error('[GUILD-ROLES] Error updating guild roles:', error)
    return NextResponse.json(
      { error: 'Failed to update guild roles' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guilds/[guildId]/roles
 * Get the Discord role requirements for accessing a specific in-game guild
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { guildId } = params

    // Get guild with role requirements
    const guild = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (guild.length === 0) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      )
    }

    const roleIds = guild[0].guildAccessRoles 
      ? JSON.parse(guild[0].guildAccessRoles)
      : []

    return NextResponse.json({
      guildId: guild[0].id,
      guildTitle: guild[0].title,
      roleIds,
      discordGuildId: guild[0].discordGuildId
    })

  } catch (error) {
    console.error('[GUILD-ROLES] Error fetching guild roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guild roles' },
      { status: 500 }
    )
  }
}
