import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, guilds } from '@/lib/db'
import { eq } from 'drizzle-orm'

/**
 * PUT /api/guilds/[guildId]/default-role
 * Update the default view-only role for a specific in-game guild
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
    const { defaultRoleId } = body

    // Validate input
    if (defaultRoleId !== null && typeof defaultRoleId !== 'string') {
      return NextResponse.json(
        { error: 'defaultRoleId must be a string or null' },
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

    // Update the default role
    const currentTime = Math.floor(Date.now() / 1000)

    await db
      .update(guilds)
      .set({
        defaultRoleId: defaultRoleId || null,
        updatedAt: new Date(currentTime * 1000)
      })
      .where(eq(guilds.id, guildId))

    console.log(`[GUILD-DEFAULT-ROLE] Updated default role for guild ${guildId}:`, defaultRoleId || 'null')

    return NextResponse.json({
      success: true,
      guildId,
      defaultRoleId: defaultRoleId || null,
      message: `Updated default view role for ${existingGuild[0].title}`
    })

  } catch (error) {
    console.error('[GUILD-DEFAULT-ROLE] Error updating default role:', error)
    return NextResponse.json(
      { error: 'Failed to update default role' },
      { status: 500 }
    )
  }
}
