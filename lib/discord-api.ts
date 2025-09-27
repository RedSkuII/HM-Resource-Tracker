// Utility functions for fetching Discord role information
// This allows displaying actual Discord role names instead of just IDs

interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
  permissions: string
}

// Cache for Discord role data to avoid excessive API calls
let roleCache: { [guildId: string]: { roles: DiscordRole[], timestamp: number } } = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch role information from Discord Guild API
 * This gives us the actual role names from Discord instead of relying on local config
 */
export async function fetchDiscordRoles(guildId: string, botToken?: string): Promise<DiscordRole[]> {
  // Check cache first
  const cached = roleCache[guildId]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.roles
  }

  try {
    // Use bot token if available, otherwise this won't work
    // Note: This requires a bot token with appropriate permissions
    if (!botToken && !process.env.DISCORD_BOT_TOKEN) {
      console.warn('No Discord bot token available for fetching role names')
      return []
    }

    const token = botToken || process.env.DISCORD_BOT_TOKEN
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.warn(`Failed to fetch Discord roles: ${response.status} ${response.statusText}`)
      return []
    }

    const roles: DiscordRole[] = await response.json()
    
    // Cache the results
    roleCache[guildId] = {
      roles,
      timestamp: Date.now()
    }

    return roles
  } catch (error) {
    console.error('Error fetching Discord roles:', error)
    return []
  }
}

/**
 * Get role name from Discord API or fall back to local config
 * If no bot token is available, returns a more user-friendly "Unknown Role"
 */
export async function getDiscordRoleName(roleId: string, guildId: string): Promise<string> {
  // First try Discord API if bot token is available
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const roles = await fetchDiscordRoles(guildId)
      const role = roles.find(r => r.id === roleId)
      
      if (role) {
        return role.name
      }
    } catch (error) {
      console.warn('Failed to fetch role name from Discord API:', error)
    }
  }

  // Fallback to local configuration
  try {
    const { getRoleName } = await import('./discord-roles')
    const localName = getRoleName(roleId)
    
    // If local config returns "Unknown Role", it means the role isn't configured
    if (localName.startsWith('Unknown Role')) {
      return `Discord Role (${roleId.slice(-4)})`  // Show last 4 digits for easier identification
    }
    
    return localName
  } catch (error) {
    return `Discord Role (${roleId.slice(-4)})`
  }
}

/**
 * Get multiple role names efficiently
 */
export async function getDiscordRoleNames(roleIds: string[], guildId: string): Promise<{ [roleId: string]: string }> {
  const roleMap: { [roleId: string]: string } = {}
  
  // First try Discord API if bot token is available
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const roles = await fetchDiscordRoles(guildId)
      
      for (const roleId of roleIds) {
        const role = roles.find(r => r.id === roleId)
        if (role) {
          roleMap[roleId] = role.name
        }
      }
      
      // If we got all roles from Discord API, return early
      if (Object.keys(roleMap).length === roleIds.length) {
        return roleMap
      }
    } catch (error) {
      console.warn('Error fetching Discord role names from API:', error)
    }
  }
  
  // Fallback to local configuration for missing roles
  try {
    const { getRoleName } = await import('./discord-roles')
    
    for (const roleId of roleIds) {
      if (!roleMap[roleId]) {  // Only fetch if not already found from Discord API
        const localName = getRoleName(roleId)
        
        // If local config returns "Unknown Role", provide a more user-friendly name
        if (localName.startsWith('Unknown Role')) {
          roleMap[roleId] = `Discord Role (${roleId.slice(-4)})`
        } else {
          roleMap[roleId] = localName
        }
      }
    }
  } catch (error) {
    console.error('Error falling back to local role config:', error)
    
    // Final fallback - just use role IDs with last 4 digits
    for (const roleId of roleIds) {
      if (!roleMap[roleId]) {
        roleMap[roleId] = `Discord Role (${roleId.slice(-4)})`
      }
    }
  }
  
  return roleMap
}