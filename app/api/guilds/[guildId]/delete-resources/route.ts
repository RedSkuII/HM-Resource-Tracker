import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, resources, resourceHistory, leaderboard, guilds } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

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
    const discordServersResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/discord/servers`, {
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
    // 1. Delete leaderboard entries
    await db.delete(leaderboard).where(eq(leaderboard.guildId, guildId))
    
    // 2. Delete resource history
    await db.delete(resourceHistory).where(eq(resourceHistory.guildId, guildId))
    
    // 3. Delete resources
    const deletedResources = await db.delete(resources).where(eq(resources.guildId, guildId))

    return NextResponse.json({
      success: true,
      message: `All resources for guild ${guild.title} have been deleted`,
      guildId,
      guildTitle: guild.title
    })

  } catch (error) {
    console.error('Error deleting guild resources:', error)
    return NextResponse.json(
      { error: 'Failed to delete guild resources' },
      { status: 500 }
    )
  }
}
