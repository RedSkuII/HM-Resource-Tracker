import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, guilds } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/guilds/[guildId]/delete-guild
 * 
 * Marks a guild for deletion. The Discord bot will pick this up during polling
 * and handle the full deletion (Discord channels/roles + database cleanup).
 * 
 * This ensures Discord resources are properly cleaned up, which the website
 * cannot do directly without bot access.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guildId } = params

    // Verify the guild exists
    const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
    
    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Check if already pending deletion
    if (guild.pendingDeletion) {
      return NextResponse.json({ 
        error: 'Guild is already pending deletion. The bot will process it shortly.',
        pendingDeletion: true 
      }, { status: 400 })
    }

    // Check if user is Discord server owner (isOwner flag from session)
    const discordGuildId = guild.discordGuildId
    
    if (!discordGuildId) {
      return NextResponse.json({ error: 'Guild has no associated Discord server' }, { status: 400 })
    }

    // Fetch Discord servers to check ownership
    const discordServersResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/discord/user-servers`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    if (!discordServersResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify Discord ownership' }, { status: 500 })
    }

    const { servers: discordServers } = await discordServersResponse.json()
    const discordServer = discordServers.find((s: any) => s.id === discordGuildId)

    // Check if user is super admin - super admin bypasses ALL permission checks
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

    // Super admin can delete any guild
    if (!isSuperAdmin) {
      // For non-super-admins, require Discord server owner/admin
      if (!discordServer || (!discordServer.isOwner && !discordServer.isAdmin)) {
        return NextResponse.json({ 
          error: 'Only Discord server owners/admins can delete guilds' 
        }, { status: 403 })
      }
    }

    // Mark guild for deletion - bot will handle full cleanup
    console.log(`[DELETE-GUILD] Marking guild ${guildId} (${guild.title}) for deletion by ${session.user.name}`)

    await db.update(guilds)
      .set({
        pendingDeletion: true,
        deletionRequestedBy: session.user.id,
        deletionRequestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(guilds.id, guildId))

    console.log(`[DELETE-GUILD] Guild ${guildId} (${guild.title}) marked for deletion`)

    // Notify Discord bot about pending deletion (optional webhook notification)
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🗑️ **Guild Pending Deletion**\n\nGuild **${guild.title}** has been marked for deletion by ${session.user.name}.\n\nThe bot will process the full deletion (Discord channels, roles, and database) shortly.`
          })
        })
      }
    } catch (webhookError) {
      console.error('[DELETE-GUILD] Failed to notify Discord:', webhookError)
      // Don't fail if webhook fails
    }

    return NextResponse.json({
      success: true,
      message: `Guild "${guild.title}" has been marked for deletion. The Discord bot will clean up channels, roles, and all data shortly.`,
      guildId,
      guildTitle: guild.title,
      pendingDeletion: true
    })

  } catch (error) {
    console.error('Error marking guild for deletion:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to mark guild for deletion',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    )
  }
}
