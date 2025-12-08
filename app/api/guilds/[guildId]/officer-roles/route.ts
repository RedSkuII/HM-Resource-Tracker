import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * DEPRECATED: PUT /api/guilds/[guildId]/officer-roles
 * 
 * This endpoint is no longer used.
 * Guild officer roles are now managed automatically via Discord roles created by the bot:
 * - /add-guild creates Member, Officer, and Leader roles
 * - /set-officer assigns Officer role (removes Member role)
 * - Website uses discord_officer_role_id for officer access
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild officer roles are now managed automatically by the bot.',
      message: 'Use /set-officer to promote members to officers.'
    },
    { status: 410 } // 410 Gone - Resource permanently removed
  )
}

/**
 * DEPRECATED: GET /api/guilds/[guildId]/officer-roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Guild officer roles are now managed automatically by the bot.',
      message: 'Guild officers are managed via Discord bot commands.'
    },
    { status: 410 }
  )
}

    // Update the guild officer roles
    const rolesJson = roleIds.length > 0 ? JSON.stringify(roleIds) : null
    const currentTime = Math.floor(Date.now() / 1000)

    await db
      .update(guilds)
      .set({
        guildOfficerRoles: rolesJson,
        updatedAt: new Date(currentTime * 1000)
      })
      .where(eq(guilds.id, guildId))

    console.log(`[GUILD-OFFICER-ROLES] Updated officer roles for guild ${guildId}:`, roleIds)

    return NextResponse.json({
      success: true,
      guildId,
      roleIds,
      message: `Updated officer roles for ${existingGuild[0].title}`
    })

  } catch (error) {
    console.error('[GUILD-OFFICER-ROLES] Error updating guild officer roles:', error)
    return NextResponse.json(
      { error: 'Failed to update guild officer roles' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guilds/[guildId]/officer-roles
 * Get the Discord officer role requirements for a specific in-game guild
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

    // Get guild with officer role requirements
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

    const roleIds = guild[0].guildOfficerRoles 
      ? JSON.parse(guild[0].guildOfficerRoles)
      : []

    return NextResponse.json({
      guildId: guild[0].id,
      guildTitle: guild[0].title,
      roleIds,
      discordGuildId: guild[0].discordGuildId
    })

  } catch (error) {
    console.error('[GUILD-OFFICER-ROLES] Error fetching guild officer roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guild officer roles' },
      { status: 500 }
    )
  }
}
