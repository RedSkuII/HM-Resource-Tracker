import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getUserIdentifier } from '@/lib/auth'
import { db, resources, guilds } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { hasResourceAccess, hasTargetEditAccess, isDiscordServerOwner } from '@/lib/discord-roles'

// PUT /api/resources/[id]/target - Update target quantity (leaders/officers/admins)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { targetQuantity } = await request.json()
    const userId = getUserIdentifier(session)
    const userRoles = session.user.roles || []
    
    // Validate target quantity
    if (targetQuantity < 0) {
      return NextResponse.json({ error: 'Target quantity cannot be negative' }, { status: 400 })
    }

    // Check if resource exists
    const currentResource = await db.select().from(resources).where(eq(resources.id, params.id))
    if (currentResource.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Verify user has access to the resource's guild
    const resource = currentResource[0]
    
    // Super admins bypass all permission checks
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
    const isSuperAdmin = superAdminUserId && session.user.id === superAdminUserId
    
    if (isSuperAdmin) {
      // Super admin - allow
    } else if (resource.guildId) {
      // Get guild info
      const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId!)).limit(1)
      
      if (guild.length === 0) {
        return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
      }
      
      const guildData = guild[0]
      const discordServerId = guildData.discordGuildId
      
      // Check if user owns this Discord server
      const isOwner = isDiscordServerOwner(session, discordServerId)
      
      // Check global permissions
      const hasGlobalAccess = hasResourceAccess(userRoles, isOwner)
      const hasGlobalTargetEdit = hasTargetEditAccess(userRoles, isOwner)
      
      // Check guild-specific permissions (leader/officer can edit targets)
      const isLeader = guildData.discordLeaderRoleId ? userRoles.includes(guildData.discordLeaderRoleId) : false
      const isOfficer = guildData.discordOfficerRoleId ? userRoles.includes(guildData.discordOfficerRoleId) : false
      
      // Allow if: global admin, global target edit permission, or guild leader/officer
      const canEditTargets = hasGlobalTargetEdit || isLeader || isOfficer
      
      console.log(`[TARGET API] User ${session.user.name} for resource ${params.id}:`)
      console.log(`  - isLeader: ${isLeader}, isOfficer: ${isOfficer}, isOwner: ${isOwner}`)
      console.log(`  - hasGlobalTargetEdit: ${hasGlobalTargetEdit}, canEditTargets: ${canEditTargets}`)
      
      if (!canEditTargets) {
        return NextResponse.json({ error: 'Insufficient permissions - leader/officer access required' }, { status: 403 })
      }
    }

    // Update the resource target quantity only (status is calculated client-side)
    await db.update(resources)
      .set({
        targetQuantity: targetQuantity,
        lastUpdatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, params.id))

    // Get the updated resource
    const updatedResource = await db.select().from(resources).where(eq(resources.id, params.id))
    
    return NextResponse.json(updatedResource[0], {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error updating target quantity:', error)
    return NextResponse.json({ error: 'Failed to update target quantity' }, { status: 500 })
  }
} 