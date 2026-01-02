import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getUserIdentifier } from '@/lib/auth'
import { db, resources } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { hasResourceAccess, hasTargetEditAccess } from '@/lib/discord-roles'

// PUT /api/resources/[id]/target - Update target quantity (admin only)
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
    
    if (!isSuperAdmin && resource.guildId) {
      const discordToken = (session as any).accessToken
      if (discordToken) {
        const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { 'Authorization': `Bearer ${discordToken}` },
        })
        if (discordResponse.ok) {
          const servers = await discordResponse.json()
          const userDiscordServers = servers.map((server: any) => server.id)
          const { guilds } = await import('@/lib/db')
          const guild = await db.select().from(guilds).where(eq(guilds.id, resource.guildId!)).limit(1)
          
          if (guild.length === 0 || !guild[0].discordGuildId || !userDiscordServers.includes(guild[0].discordGuildId)) {
            return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 })
          }
          
          // Check permissions for THIS specific Discord server
          const { isDiscordServerOwner } = await import('@/lib/discord-roles')
          const discordServerId = guild[0].discordGuildId
          const isOwner = isDiscordServerOwner(session, discordServerId)
          
          if (!hasResourceAccess(session.user.roles, isOwner)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          }
          
          if (!hasTargetEditAccess(session.user.roles, isOwner)) {
            return NextResponse.json({ error: 'Insufficient permissions - admin access required' }, { status: 403 })
          }
        }
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