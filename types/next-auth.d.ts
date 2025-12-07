import NextAuth from "next-auth"

interface UserPermissions {
  hasResourceAccess: boolean
  hasResourceAdminAccess: boolean
  hasTargetEditAccess: boolean
  // 🆕 Add new permissions:
  hasReportAccess: boolean
  hasUserManagementAccess: boolean
  hasDataExportAccess: boolean
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      roles: string[]
      isInGuild: boolean
      discordNickname?: string | null
      customNickname?: string | null
      ownedServerIds: string[]
      allServerIds: string[]
      serverRolesMap: Record<string, string[]>
      serverNames: Record<string, string>
      roleNames: Record<string, string>
      permissions: UserPermissions
    }
  }

  interface JWT {
    accessToken?: string
    userRoles?: string[]
    isInGuild?: boolean
    rolesFetched?: boolean
    discordNickname?: string | null
    ownedServerIds?: string[]
    allServerIds?: string[]
    serverRolesMap?: Record<string, string[]>
    serverNames?: Record<string, string>
    roleNames?: Record<string, string>
    permissions?: UserPermissions
  }
} 