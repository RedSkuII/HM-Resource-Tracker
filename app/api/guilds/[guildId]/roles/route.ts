import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * DEPRECATED: PUT /api/guilds/[guildId]/roles
 * 
 * This endpoint is no longer used.
 * Guild access is now managed automatically via Discord roles created by the bot:
 * - /add-guild creates Member, Officer, and Leader roles
 * - /add-guildie, /set-officer, /set-leader assign these roles
 * - Website uses discord_role_id, discord_officer_role_id, discord_leader_role_id for access
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild roles are now managed automatically by the bot.',
      message: 'Use /add-guild to create a guild, then /add-guildie, /set-officer, /set-leader to manage members.'
    },
    { status: 410 } // 410 Gone - Resource permanently removed
  )
}

/**
 * DEPRECATED: GET /api/guilds/[guildId]/roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild roles are now managed automatically by the bot.',
      message: 'Guild members are managed via Discord bot commands.'
    },
    { status: 410 }
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
      defaultRoleId: guild[0].defaultRoleId || null,
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
