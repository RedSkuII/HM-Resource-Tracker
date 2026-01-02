/**
 * Guild Access Control Helpers
 * Checks if a user has access to a specific in-game guild based on their Discord roles
 * 
 * NEW: Uses automatic role assignment system
 * - discord_role_id (Member role) = View/edit access
 * - discord_officer_role_id (Officer role) = View/edit access
 * - discord_leader_role_id (Leader role) = View/edit access
 * - admin_role_id (Bot Admin roles) = Bot dashboard access for THIS guild
 */

import { db, guilds } from './db'
import { eq } from 'drizzle-orm'

/**
 * Check if user has bot admin access for a specific guild via guild-specific adminRoleId
 * @param guildId - The in-game guild ID (e.g., 'house-melange')
 * @param userRoles - Array of user's Discord role IDs
 * @returns Promise<boolean> - True if user has guild-specific bot admin access
 */
export async function hasGuildBotAdminAccess(
  guildId: string,
  userRoles: string[]
): Promise<boolean> {
  try {
    // Fetch guild configuration
    const guildData = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (guildData.length === 0) {
      console.warn(`[GUILD-ACCESS] Guild not found for admin check: ${guildId}`)
      return false
    }

    const guild = guildData[0]

    // Parse adminRoleId JSON array
    if (!guild.adminRoleId) {
      return false
    }

    let adminRoles: string[]
    try {
      adminRoles = JSON.parse(guild.adminRoleId)
    } catch {
      // Legacy single value support
      adminRoles = [guild.adminRoleId]
    }

    if (adminRoles.length === 0) {
      return false
    }

    // Check if user has any of the guild's admin roles
    const hasAdminRole = adminRoles.some(roleId => userRoles.includes(roleId))

    if (hasAdminRole) {
      console.log(`[GUILD-ACCESS] ✓ User has guild admin role for "${guild.title}"`)
    }

    return hasAdminRole

  } catch (error) {
    console.error('[GUILD-ACCESS] Error checking guild bot admin access:', error)
    return false
  }
}

/**
 * Check if user has bot admin access for any guild on a Discord server via guild-specific adminRoleId
 * @param discordGuildId - The Discord server ID
 * @param userRoles - Array of user's Discord role IDs
 * @returns Promise<string[]> - Array of guild IDs the user has admin access to
 */
export async function getGuildsWithBotAdminAccess(
  discordGuildId: string,
  userRoles: string[]
): Promise<string[]> {
  try {
    // Fetch all guilds for this Discord server
    const allGuilds = await db
      .select()
      .from(guilds)
      .where(eq(guilds.discordGuildId, discordGuildId))

    const adminGuildIds: string[] = []

    for (const guild of allGuilds) {
      if (!guild.adminRoleId) continue

      let adminRoles: string[]
      try {
        adminRoles = JSON.parse(guild.adminRoleId)
      } catch {
        adminRoles = [guild.adminRoleId]
      }

      if (adminRoles.length === 0) continue

      // Check if user has any of this guild's admin roles
      if (adminRoles.some(roleId => userRoles.includes(roleId))) {
        console.log(`[GUILD-ACCESS] ✓ User has guild admin role for "${guild.title}"`)
        adminGuildIds.push(guild.id)
      }
    }

    return adminGuildIds

  } catch (error) {
    console.error('[GUILD-ACCESS] Error getting guilds with bot admin access:', error)
    return []
  }
}

/**
 * Check if user has access to a specific guild based on automatic Discord roles
 * @param guildId - The in-game guild ID (e.g., 'house-melange')
 * @param userRoles - Array of user's Discord role IDs
 * @param hasGlobalAccess - Whether user has global resource access (admin/target edit)
 * @returns Promise<boolean> - True if user can access the guild
 */
export async function canAccessGuild(
  guildId: string,
  userRoles: string[],
  hasGlobalAccess: boolean = false
): Promise<boolean> {
  try {
    // Admins always have access to all guilds
    if (hasGlobalAccess) {
      return true
    }

    // Fetch guild configuration
    const guildData = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (guildData.length === 0) {
      console.warn(`[GUILD-ACCESS] Guild not found: ${guildId}`)
      return false
    }

    const guild = guildData[0]

    // Check if user has any of the guild's automatic roles
    // Member, Officer, or Leader role = access granted
    const guildRoles = [
      guild.discordRoleId,        // Member role
      guild.discordOfficerRoleId,  // Officer role
      guild.discordLeaderRoleId    // Leader role
    ].filter(Boolean) as string[] // Remove nulls

    if (guildRoles.length === 0) {
      console.log(`[GUILD-ACCESS] No automatic roles found for guild ${guild.title}`)
      return false
    }

    const hasGuildRole = guildRoles.some(roleId => userRoles.includes(roleId))

    if (!hasGuildRole) {
      console.log(`[GUILD-ACCESS] User lacks guild roles for ${guild.title}`)
      console.log(`  Guild roles:`, guildRoles)
      console.log(`  User roles:`, userRoles)
    }

    return hasGuildRole

  } catch (error) {
    console.error('[GUILD-ACCESS] Error checking guild access:', error)
    // Fail closed - deny access on error
    return false
  }
}

/**
 * Get all guilds that a user has access to
 * @param discordGuildId - The Discord server ID
 * @param userRoles - Array of user's Discord role IDs  
 * @param userDiscordId - The user's Discord ID (for leader check)
 * @param isDiscordServerOwner - Whether the user owns/administrates this Discord server
 * @param hasGlobalAccess - Whether user has global resource access
 * @returns Promise<string[]> - Array of accessible guild IDs
 */
export async function getAccessibleGuilds(
  discordGuildId: string,
  userRoles: string[],
  userDiscordId: string,
  isDiscordServerOwner: boolean = false,
  hasGlobalAccess: boolean = false
): Promise<string[]> {
  try {
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
    const isSuperAdmin = superAdminUserId && userDiscordId === superAdminUserId
    
    // Fetch all guilds for this Discord server
    const allGuilds = await db
      .select()
      .from(guilds)
      .where(eq(guilds.discordGuildId, discordGuildId))

    // Super admin sees all guilds
    if (isSuperAdmin) {
      console.log(`[GUILD-ACCESS] Super admin access: showing all ${allGuilds.length} guilds`)
      return allGuilds.map(g => g.id)
    }

    // Discord server owners/admins see all guilds on their server
    if (isDiscordServerOwner || hasGlobalAccess) {
      console.log(`[GUILD-ACCESS] Discord server owner/admin access: showing all ${allGuilds.length} guilds`)
      return allGuilds.map(g => g.id)
    }

    // Filter guilds based on automatic role assignment
    const accessibleGuilds = allGuilds.filter(guild => {
      // Collect all guild roles (member, officer, leader)
      const guildRoles = [
        guild.discordRoleId,        // Member role
        guild.discordOfficerRoleId,  // Officer role
        guild.discordLeaderRoleId    // Leader role
      ].filter(Boolean) as string[]

      if (guildRoles.length === 0) {
        console.log(`[GUILD-ACCESS] ✗ No roles configured for "${guild.title}"`)
        return false
      }

      // Check if user has any of these roles
      const hasAccess = guildRoles.some(roleId => userRoles.includes(roleId))

      if (hasAccess) {
        console.log(`[GUILD-ACCESS] ✓ User has access to "${guild.title}"`)
      } else {
        console.log(`[GUILD-ACCESS] ✗ User lacks roles for "${guild.title}"`)
      }

      return hasAccess
    })

    console.log(`[GUILD-ACCESS] User ${userDiscordId} has access to ${accessibleGuilds.length}/${allGuilds.length} guilds in server ${discordGuildId}`)
    
    return accessibleGuilds.map(g => g.id)

  } catch (error) {
    console.error('[GUILD-ACCESS] Error getting accessible guilds:', error)
    return []
  }
}

/**
 * Check if user is a guild leader or officer for a specific guild
 * @param guildId - The in-game guild ID
 * @param userRoles - Array of user's Discord role IDs
 * @returns Promise<{ isLeader: boolean, isOfficer: boolean, isMember: boolean }> - User's role in the guild
 */
export async function getGuildMembershipRole(
  guildId: string,
  userRoles: string[]
): Promise<{ isLeader: boolean, isOfficer: boolean, isMember: boolean }> {
  try {
    // Fetch guild configuration
    const guildData = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1)

    if (guildData.length === 0) {
      return { isLeader: false, isOfficer: false, isMember: false }
    }

    const guild = guildData[0]

    // Check if user has the leader role
    const isLeader = guild.discordLeaderRoleId ? userRoles.includes(guild.discordLeaderRoleId) : false

    // Check if user has the officer role
    const isOfficer = guild.discordOfficerRoleId ? userRoles.includes(guild.discordOfficerRoleId) : false

    // Check if user has the member role
    const isMember = guild.discordRoleId ? userRoles.includes(guild.discordRoleId) : false

    if (isLeader) {
      console.log(`[GUILD-ACCESS] User is LEADER of "${guild.title}"`)
    } else if (isOfficer) {
      console.log(`[GUILD-ACCESS] User is OFFICER of "${guild.title}"`)
    } else if (isMember) {
      console.log(`[GUILD-ACCESS] User is MEMBER of "${guild.title}"`)
    }

    return { isLeader, isOfficer, isMember }
  } catch (error) {
    console.error('[GUILD-ACCESS] Error checking guild membership role:', error)
    return { isLeader: false, isOfficer: false, isMember: false }
  }
}

/**
 * Check if user can manage resources for a specific guild (create/edit/delete)
 * Leaders and officers can manage resources for their guild
 * @param guildId - The in-game guild ID
 * @param userRoles - Array of user's Discord role IDs
 * @param hasGlobalAdminAccess - Whether user has global admin access
 * @returns Promise<boolean> - True if user can manage resources for this guild
 */
export async function canManageGuildResources(
  guildId: string,
  userRoles: string[],
  hasGlobalAdminAccess: boolean = false
): Promise<boolean> {
  // Global admins can manage all guilds
  if (hasGlobalAdminAccess) {
    return true
  }

  // Check guild-specific role
  const { isLeader, isOfficer } = await getGuildMembershipRole(guildId, userRoles)
  
  // Leaders and officers can manage guild resources
  return isLeader || isOfficer
}

/**
 * Get all accessible guild IDs for a user across ALL Discord servers they are in
 * This is used for leaderboard, activity, and other cross-guild queries
 * @param session - NextAuth session object
 * @returns Promise<string[]> - Array of all accessible guild IDs
 */
export async function getAccessibleGuildsForUser(session: any): Promise<string[]> {
  try {
    const userDiscordId = session.user.id
    const allServerIds = session.user.allServerIds || []
    const ownedServerIds = session.user.ownedServerIds || []
    const serverRolesMap = session.user.serverRolesMap || {}
    const hasGlobalAccess = session.user.permissions?.hasResourceAdminAccess || false
    
    const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
    const isSuperAdmin = superAdminUserId && userDiscordId === superAdminUserId
    
    // Super admin gets all guilds
    if (isSuperAdmin) {
      const allGuilds = await db.select({ id: guilds.id }).from(guilds)
      console.log(`[GUILD-ACCESS] Super admin: access to all ${allGuilds.length} guilds`)
      return allGuilds.map(g => g.id)
    }
    
    // Collect accessible guilds from all Discord servers the user is in
    const accessibleGuildIds: string[] = []
    
    for (const discordServerId of allServerIds) {
      const userRoles = serverRolesMap[discordServerId] || []
      const isOwner = ownedServerIds.includes(discordServerId)
      
      const serverGuilds = await getAccessibleGuilds(
        discordServerId,
        userRoles,
        userDiscordId,
        isOwner,
        hasGlobalAccess
      )
      
      accessibleGuildIds.push(...serverGuilds)
    }
    
    // Remove duplicates
    const uniqueGuildIds = [...new Set(accessibleGuildIds)]
    console.log(`[GUILD-ACCESS] User ${userDiscordId} has access to ${uniqueGuildIds.length} total guilds across ${allServerIds.length} servers`)
    
    return uniqueGuildIds
  } catch (error) {
    console.error('[GUILD-ACCESS] Error getting accessible guilds for user:', error)
    return []
  }
}