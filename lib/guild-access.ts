/**
 * Guild Access Control Helpers
 * Checks if a user has access to a specific in-game guild based on their Discord roles
 * 
 * NEW: Uses automatic role assignment system
 * - discord_role_id (Member role) = View/edit access
 * - discord_officer_role_id (Officer role) = View/edit access
 * - discord_leader_role_id (Leader role) = View/edit access
 */

import { db, guilds } from './db'
import { eq } from 'drizzle-orm'

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
