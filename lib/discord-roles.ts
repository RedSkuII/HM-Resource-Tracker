// Types for role configuration
type RoleConfig = {
  id: string;
  name: string;
  level: number;
  isAdmin?: boolean;
  canEditTargets?: boolean;
  canAccessResources?: boolean;
  canManageBotSettings?: boolean; // Access to bot dashboard configuration
  // 🆕 Add new permissions here:
  canViewReports?: boolean;     // Example: View analytics/reports
  canManageUsers?: boolean;     // Example: Manage user accounts
  canExportData?: boolean;      // Example: Export system data
}

// Parse the JSON role configuration from environment variable
function parseRoleConfig(): RoleConfig[] {
  try {
    const roleConfig = process.env.DISCORD_ROLES_CONFIG
    if (!roleConfig) {
      // Only log on server startup, not repeatedly
      if (process.env.NODE_ENV === 'development') {
        console.info('No DISCORD_ROLES_CONFIG found - using server owner permissions only')
      }
      return []
    }
    
    const parsed = JSON.parse(roleConfig)
    
    // Validate that it's an array
    if (!Array.isArray(parsed)) {
      console.error('DISCORD_ROLES_CONFIG must be an array, got:', typeof parsed)
      return []
    }
    
    // Validate each role object
    const validRoles = parsed.filter(role => {
      if (!role || typeof role !== 'object') {
        console.warn('Invalid role object in DISCORD_ROLES_CONFIG')
        return false
      }
      if (!role.id || !role.name) {
        console.warn('Role missing required fields (id, name) in DISCORD_ROLES_CONFIG')
        return false
      }
      return true
    })
    
    if (validRoles.length === 0) {
      console.warn('No valid roles found in DISCORD_ROLES_CONFIG')
    }
    
    return validRoles
    
  } catch (error) {
    console.error('Failed to parse DISCORD_ROLES_CONFIG:', error instanceof Error ? error.message : 'Invalid JSON')
    console.error('Expected format: [{"id":"123","name":"Role","level":1,"canAccessResources":true}]')
    return []
  }
}

// Discord role hierarchy from environment configuration
const ROLE_HIERARCHY = parseRoleConfig()

// Specific admin roles that can edit/delete/create resources
const RESOURCE_ADMIN_ROLES = ROLE_HIERARCHY
  .filter(role => role.isAdmin)
  .map(role => role.id)

// Admin roles that can edit target quantities
const TARGET_ADMIN_ROLES = ROLE_HIERARCHY
  .filter(role => role.canEditTargets)
  .map(role => role.id)

// Roles that can access the resource management system
const RESOURCE_ACCESS_ROLES = ROLE_HIERARCHY
  .filter(role => role.canAccessResources)
  .map(role => role.id)

// Helper function to get role information by ID
export function getRoleInfo(roleId: string) {
  return ROLE_HIERARCHY.find(role => role.id === roleId)
}

// Helper function to get role name by ID
export function getRoleName(roleId: string): string {
  const role = getRoleInfo(roleId)
  return role ? role.name : `Unknown Role (${roleId})`
}

// Helper function to get the highest role a user has
export function getHighestRole(userRoles: string[]) {
  let highestRole = null
  let highestLevel = 0

  for (const roleId of userRoles) {
    const role = getRoleInfo(roleId)
    if (role && role.level > highestLevel) {
      highestLevel = role.level
      highestRole = role
    }
  }

  return highestRole
}

// Helper function to get all hierarchy roles a user has (sorted by level descending)
export function getHierarchyRoles(userRoles: string[]): Array<RoleConfig> {
  return userRoles
    .map(roleId => getRoleInfo(roleId))
    .filter((role): role is RoleConfig => role !== undefined)
    .sort((a, b) => b.level - a.level)
}



// Helper function to check if user has resource access
export function hasResourceAccess(userRoles: string[], isServerOwner: boolean = false): boolean {
  // Server owners always have access
  if (isServerOwner) {
    return true
  }
  
  if (RESOURCE_ACCESS_ROLES.length === 0) {
    // Only log once per session, not on every call
    return true // Allow access when no roles are configured
  }
  return userRoles.some(role => RESOURCE_ACCESS_ROLES.includes(role))
}

// Helper function to check if user has resource admin access (edit/delete/create)
export function hasResourceAdminAccess(userRoles: string[], isServerOwner: boolean = false): boolean {
  // Server owners always have admin access
  if (isServerOwner) {
    return true
  }
  
  if (RESOURCE_ADMIN_ROLES.length === 0) {
    // Only log once per session, not on every call
    return true // Allow admin access when no roles are configured
  }
  return userRoles.some(role => RESOURCE_ADMIN_ROLES.includes(role))
}

// Helper function to check if user has admin access for target editing
export function hasTargetEditAccess(userRoles: string[], isServerOwner: boolean = false): boolean {
  // Server owners always have target edit access
  if (isServerOwner) {
    return true
  }
  
  if (TARGET_ADMIN_ROLES.length === 0) {
    // Return false silently - server owners will still have access
    return false
  }
  return userRoles.some(role => TARGET_ADMIN_ROLES.includes(role))
}

// 🆕 Add new permission check functions:

// Helper function to check if user can view reports
export function hasReportAccess(userRoles: string[]): boolean {
  const reportRoles = ROLE_HIERARCHY.filter(role => role.canViewReports).map(role => role.id)
  return userRoles.some(role => reportRoles.includes(role))
}

// Helper function to check if user can manage users
export function hasUserManagementAccess(userRoles: string[]): boolean {
  const userManagementRoles = ROLE_HIERARCHY.filter(role => role.canManageUsers).map(role => role.id)
  return userRoles.some(role => userManagementRoles.includes(role))
}

// Helper function to check if user can export data
export function hasDataExportAccess(userRoles: string[]): boolean {
  const dataExportRoles = ROLE_HIERARCHY.filter(role => role.canExportData).map(role => role.id)
  return userRoles.some(role => dataExportRoles.includes(role))
}

// Helper function to check if user can access bot dashboard
export function hasBotAdminAccess(userRoles: string[], isServerOwner: boolean = false): boolean {
  // Server owners always have bot admin access
  if (isServerOwner) {
    return true
  }
  
  const botAdminRoles = ROLE_HIERARCHY.filter(role => role.canManageBotSettings).map(role => role.id)
  
  if (botAdminRoles.length === 0) {
    // If no specific bot admin roles configured, fall back to resource admin access
    return hasResourceAdminAccess(userRoles, isServerOwner)
  }
  
  return userRoles.some(role => botAdminRoles.includes(role))
}