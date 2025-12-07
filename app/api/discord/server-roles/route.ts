import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessToken = (session as any).accessToken
    const serverRolesMap = session.user.serverRolesMap || {}
    
    if (!accessToken) {
      console.warn('[SERVER-ROLES] No access token available')
      return NextResponse.json({ roleNames: {} })
    }

    // Get all unique role IDs from all servers
    const allRoleIds = new Set<string>()
    const serverToRoles: Record<string, string[]> = {}
    
    for (const [serverId, roleIds] of Object.entries(serverRolesMap)) {
      serverToRoles[serverId] = roleIds
      roleIds.forEach(roleId => allRoleIds.add(roleId))
    }

    console.log('[SERVER-ROLES] Fetching role names for', allRoleIds.size, 'unique roles across', Object.keys(serverToRoles).length, 'servers')

    // Fetch role names from Discord for each server
    const roleNames: Record<string, string> = {}
    
    for (const [serverId, roleIds] of Object.entries(serverToRoles)) {
      try {
        // Fetch guild info which includes roles
        const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}`, {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        })
        
        if (response.ok) {
          const guildData = await response.json()
          const roles = guildData.roles || []
          
          // Map role IDs to names for roles the user has
          for (const roleId of roleIds) {
            const role = roles.find((r: any) => r.id === roleId)
            if (role) {
              roleNames[roleId] = role.name
            }
          }
        } else {
          console.warn(`[SERVER-ROLES] Failed to fetch roles for server ${serverId}:`, response.status)
        }
      } catch (error) {
        console.error(`[SERVER-ROLES] Error fetching roles for server ${serverId}:`, error)
      }
    }

    console.log('[SERVER-ROLES] Fetched', Object.keys(roleNames).length, 'role names')

    return NextResponse.json({ roleNames })
  } catch (error) {
    console.error('[SERVER-ROLES] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
