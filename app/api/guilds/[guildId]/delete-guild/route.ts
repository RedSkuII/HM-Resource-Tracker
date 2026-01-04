import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  db, 
  guilds,
  resources, 
  resourceHistory, 
  leaderboard,
  discordOrders,
  resourceDiscordMapping,
  discordEmbeds,
  websiteChanges,
  botActivityLogs
} from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

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

    // Check if user is super admin
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

    // Allow: Discord server owner, Discord admin (ADMINISTRATOR permission), or super admin
    if (!discordServer || (!discordServer.isOwner && !discordServer.isAdmin && !isSuperAdmin)) {
      return NextResponse.json({ 
        error: 'Only Discord server owners/admins can delete guilds' 
      }, { status: 403 })
    }

    // Delete guild and all related data
    
    // First, get all resource IDs for this guild
    const guildResources = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.guildId, guildId))
    
    const resourceIds = guildResources.map(r => r.id)
    
    console.log(`[DELETE-GUILD] Deleting guild ${guildId} (${guild.title}) with ${resourceIds.length} resources`)

    // Delete in order of foreign key dependencies
    
    if (resourceIds.length > 0) {
      // 1. Delete resource history entries (references resources.id)
      for (const resourceId of resourceIds) {
        await db.delete(resourceHistory).where(eq(resourceHistory.resourceId, resourceId))
      }
      
      // 2. Delete leaderboard entries (references resources.id)
      for (const resourceId of resourceIds) {
        await db.delete(leaderboard).where(eq(leaderboard.resourceId, resourceId))
      }
      
      // 3. Delete discord orders (references resources.id)
      for (const resourceId of resourceIds) {
        await db.delete(discordOrders).where(eq(discordOrders.resourceId, resourceId))
      }
      
      // 4. Delete resource discord mappings (references resources.id)
      for (const resourceId of resourceIds) {
        await db.delete(resourceDiscordMapping).where(eq(resourceDiscordMapping.resourceId, resourceId))
      }
      
      // 5. Delete website changes (references resources.id)
      for (const resourceId of resourceIds) {
        await db.delete(websiteChanges).where(eq(websiteChanges.resourceId, resourceId))
      }
    }
    
    // 6. Delete discord embeds (by discord guild ID)
    await db.delete(discordEmbeds).where(eq(discordEmbeds.guildId, discordGuildId))
    
    // 7. Delete bot activity logs (by discord guild ID)
    await db.delete(botActivityLogs).where(eq(botActivityLogs.guildId, discordGuildId))
    
    // 8. Delete resources
    await db.delete(resources).where(eq(resources.guildId, guildId))
    
    // 9. Finally, delete the guild itself
    await db.delete(guilds).where(eq(guilds.id, guildId))

    console.log(`[DELETE-GUILD] Successfully deleted guild ${guildId} (${guild.title})`)

    // Notify Discord bot about guild deletion
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🗑️ **Guild Deleted**\n\nGuild **${guild.title}** (ID: \`${guildId}\`) has been permanently deleted by ${session.user.name} from the website.\n\nAll associated resources, history, and data have been removed.`
          })
        })
      }
    } catch (webhookError) {
      console.error('[DELETE-GUILD] Failed to notify Discord:', webhookError)
      // Don't fail the deletion if webhook fails
    }

    return NextResponse.json({
      success: true,
      message: `Guild "${guild.title}" and all its data have been permanently deleted`,
      guildId,
      guildTitle: guild.title,
      deletedResourceCount: resourceIds.length
    })

  } catch (error) {
    console.error('Error deleting guild:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to delete guild',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    )
  }
}
