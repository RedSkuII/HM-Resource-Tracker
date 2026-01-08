import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, resourceHistory, resources, guilds } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { hasResourceAdminAccess, isDiscordServerOwner } from '@/lib/discord-roles'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resourceId = params.id
    const entryId = params.entryId
    const userRoles = session.user.roles || []

    // Verify the entry exists and belongs to this resource
    const existingEntry = await db
      .select()
      .from(resourceHistory)
      .where(and(
        eq(resourceHistory.id, entryId),
        eq(resourceHistory.resourceId, resourceId)
      ))
      .limit(1)

    if (existingEntry.length === 0) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 })
    }

    // Get the resource to determine which guild it belongs to
    const resource = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1)
    if (resource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Check if user is super admin - they bypass all permission checks
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId

    if (isSuperAdmin) {
      // Super admin - allow
    } else if (resource[0].guildId) {
      // Get guild info
      const guild = await db.select().from(guilds).where(eq(guilds.id, resource[0].guildId)).limit(1)
      
      if (guild.length === 0) {
        return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
      }
      
      const guildData = guild[0]
      const discordServerId = guildData.discordGuildId
      
      // Check if user owns this Discord server
      const isOwner = isDiscordServerOwner(session, discordServerId)
      
      // Check global permissions
      const hasGlobalAdmin = hasResourceAdminAccess(userRoles, isOwner)
      
      // Check guild-specific permissions (leader/officer can delete history)
      const isLeader = guildData.discordLeaderRoleId ? userRoles.includes(guildData.discordLeaderRoleId) : false
      const isOfficer = guildData.discordOfficerRoleId ? userRoles.includes(guildData.discordOfficerRoleId) : false
      
      // Allow if: global admin or guild leader/officer
      const canDeleteHistory = hasGlobalAdmin || isLeader || isOfficer
      
      console.log(`[HISTORY DELETE API] User ${session.user.name} for entry ${entryId}:`)
      console.log(`  - isLeader: ${isLeader}, isOfficer: ${isOfficer}, isOwner: ${isOwner}`)
      console.log(`  - hasGlobalAdmin: ${hasGlobalAdmin}, canDeleteHistory: ${canDeleteHistory}`)
      
      if (!canDeleteHistory) {
        return NextResponse.json({ error: 'Insufficient permissions - leader/officer access required' }, { status: 403 })
      }
    } else {
      // Resource has no guild - check global admin only
      const isOwner = isDiscordServerOwner(session)
      if (!hasResourceAdminAccess(userRoles, isOwner)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Delete the history entry
    await db
      .delete(resourceHistory)
      .where(and(
        eq(resourceHistory.id, entryId),
        eq(resourceHistory.resourceId, resourceId)
      ))

    return NextResponse.json({ 
      success: true,
      message: 'History entry deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting history entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 