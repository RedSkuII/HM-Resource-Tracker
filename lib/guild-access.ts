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
 * @param hasGlobalAccess - Whether user has global resource access
 * @returns Promise<string[]> - Array of accessible guild IDs
 */
export async function getAccessibleGuilds(
  discordGuildId: string,
  userRoles: string[],
  hasGlobalAccess: boolean = false
): Promise<string[]> {
  try {
    // Fetch all guilds for this Discord server
    const allGuilds = await db
      .select()
      .from(guilds)
      .where(eq(guilds.discordGuildId, discordGuildId))

    // Admins see all guilds
    if (hasGlobalAccess) {
      return allGuilds.map(g => g.id)
    }

    // Filter guilds based on role requirements
    const accessibleGuilds = allGuilds.filter(guild => {
      // No role restrictions = accessible to all
      if (!guild.guildAccessRoles) {
        return true
      }

      const requiredRoles: string[] = JSON.parse(guild.guildAccessRoles)
      
      // Empty role list = accessible to all
      if (requiredRoles.length === 0) {
        return true
      }

      // Check if user has at least one required role
      return requiredRoles.some(roleId => userRoles.includes(roleId))
    })

    return accessibleGuilds.map(g => g.id)

  } catch (error) {
    console.error('[GUILD-ACCESS] Error getting accessible guilds:', error)
    return []
  }
}
