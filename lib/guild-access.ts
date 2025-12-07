/**
 * Guild Access Control Helpers
 * Checks if a user has access to a specific in-game guild based on their Discord roles
 */

import { db, guilds } from './db'
import { eq } from 'drizzle-orm'

/**
 * Check if user has access to a specific guild based on guild-specific role requirements
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

    // If no role restrictions are set, allow all users with basic resource access
    if (!guild.guildAccessRoles) {
      return true
    }

    // Parse required roles
    const requiredRoles: string[] = JSON.parse(guild.guildAccessRoles)

    // If empty array, allow all users
    if (requiredRoles.length === 0) {
      return true
    }

    // Check if user has at least ONE of the required roles
    const hasRequiredRole = requiredRoles.some(roleId => userRoles.includes(roleId))

    if (!hasRequiredRole) {
      console.log(`[GUILD-ACCESS] User lacks required roles for guild ${guild.title}`)
      console.log(`  Required roles:`, requiredRoles)
      console.log(`  User roles:`, userRoles)
    }

    return hasRequiredRole

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
 * @param hasGlobalAccess - Whether user has global resource access
 * @returns Promise<string[]> - Array of accessible guild IDs
 */
export async function getAccessibleGuilds(
  discordGuildId: string,
  userRoles: string[],
  userDiscordId: string,
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
      return allGuilds.map(g => g.id)
    }

    // Filter guilds based on EXPLICIT access only
    const accessibleGuilds = allGuilds.filter(guild => {
      // Check 1: Is user the guild leader?
      if (guild.leaderId === userDiscordId) {
        return true
      }

      // Check 2: Does user have an access role?
      if (guild.guildAccessRoles) {
        try {
          const accessRoles: string[] = JSON.parse(guild.guildAccessRoles)
          if (accessRoles.length > 0 && accessRoles.some(roleId => userRoles.includes(roleId))) {
            return true
          }
        } catch (e) {
          console.error('[GUILD-ACCESS] Error parsing guildAccessRoles:', e)
        }
      }

      // Check 3: Does user have an officer role?
      if (guild.guildOfficerRoles) {
        try {
          const officerRoles: string[] = JSON.parse(guild.guildOfficerRoles)
          if (officerRoles.length > 0 && officerRoles.some(roleId => userRoles.includes(roleId))) {
            return true
          }
        } catch (e) {
          console.error('[GUILD-ACCESS] Error parsing guildOfficerRoles:', e)
        }
      }

      // Check 4: Does user have the default role?
      if (guild.defaultRoleId && userRoles.includes(guild.defaultRoleId)) {
        return true
      }

      // No explicit access granted
      return false
    })

    console.log(`[GUILD-ACCESS] User ${userDiscordId} has access to ${accessibleGuilds.length}/${allGuilds.length} guilds in server ${discordGuildId}`)
    
    return accessibleGuilds.map(g => g.id)

  } catch (error) {
    console.error('[GUILD-ACCESS] Error getting accessible guilds:', error)
    return []
  }
}
