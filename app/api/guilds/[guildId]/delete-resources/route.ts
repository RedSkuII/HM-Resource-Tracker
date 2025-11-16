import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  db, 
  resources, 
  resourceHistory, 
  leaderboard, 
  guilds,
  discordOrders,
  resourceDiscordMapping,
  websiteChanges
} from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'

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
    // The session should have the Discord servers list with isOwner flags
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

    const discordServers = await discordServersResponse.json()
    const discordServer = discordServers.find((s: any) => s.id === discordGuildId)

    if (!discordServer || !discordServer.isOwner) {
      return NextResponse.json({ 
        error: 'Only Discord server owners can delete all resources for a guild' 
      }, { status: 403 })
    }

    // Delete all resources and related data for this in-game guild
    
    // First, get all resource IDs for this guild
    const guildResources = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.guildId, guildId))
    
    const resourceIds = guildResources.map(r => r.id)
    
    if (resourceIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No resources found for guild ${guild.title}`,
        guildId,
        guildTitle: guild.title
      })
    }

    // Delete in order of foreign key dependencies
    
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
    
    // 6. Finally, delete the resources themselves
    await db.delete(resources).where(eq(resources.guildId, guildId))

    return NextResponse.json({
      success: true,
      message: `All ${resourceIds.length} resources for guild ${guild.title} have been deleted`,
      guildId,
      guildTitle: guild.title,
      deletedCount: resourceIds.length
    })

  } catch (error) {
    console.error('Error deleting guild resources:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to delete guild resources',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    )
  }
}
