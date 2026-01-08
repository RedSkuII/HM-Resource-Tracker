import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { Session } from "next-auth"
import { hasResourceAccess, hasResourceAdminAccess, hasTargetEditAccess, hasReportAccess, hasUserManagementAccess, hasDataExportAccess } from './discord-roles'

interface UserPermissions {
  hasResourceAccess: boolean
  hasResourceAdminAccess: boolean
  hasTargetEditAccess: boolean
  hasReportAccess: boolean
  hasUserManagementAccess: boolean
  hasDataExportAccess: boolean
  isTrueAdmin: boolean  // Super admin or role-based admin only (NOT Discord ADMINISTRATOR)
}

// Discord API scopes needed for role checking and server access
const scopes = ['identify', 'guilds', 'guilds.members.read'].join(' ')

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: scopes } },
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 4 * 60 * 60, // 4 hours in seconds
    updateAge: 30 * 60,  // Update session every 30 minutes
  },
  jwt: {
    maxAge: 4 * 60 * 60, // 4 hours in seconds
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Create or update user in database on sign in
      if (account?.provider === 'discord' && user.id) {
        try {
          const { db, users } = await import('./db')
          const { eq } = await import('drizzle-orm')
          const { nanoid } = await import('nanoid')
          
          // Check if user exists
          const existingUser = await db.select().from(users).where(eq(users.discordId, user.id)).limit(1)
          
          if (existingUser.length > 0) {
            // Update existing user
            await db.update(users)
              .set({
                username: user.name || 'Unknown',
                avatar: user.image || null,
                lastLogin: new Date(),
              })
              .where(eq(users.discordId, user.id))
            
            console.log(`Updated existing user: ${user.name} (Discord ID: ${user.id})`)
          } else {
            // Create new user
            await db.insert(users).values({
              id: nanoid(),
              discordId: user.id,
              username: user.name || 'Unknown',
              avatar: user.image || null,
              customNickname: null,
              createdAt: new Date(),
              lastLogin: new Date(),
            })
            
            console.log(`Created new user: ${user.name} (Discord ID: ${user.id})`)
          }
        } catch (error) {
          console.error('Error creating/updating user:', error)
          // Don't block sign in if user creation fails
        }
      }
      
      return true
    },
    async jwt({ token, account, trigger }) {
      // Store access token from initial login
      if (account) {
        token.accessToken = account.access_token
        // Mark that we need to fetch roles on the next session call
        token.rolesFetched = false
      }

      // Fetch Discord roles and nickname on login or when explicitly triggered
      if (token.accessToken && (!token.rolesFetched || trigger === 'update')) {
        try {
          // Fetch user's Discord servers to check ownership and membership
          const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          })
          
          let ownedServerIds: string[] = []
          let adminServerIds: string[] = []  // Servers where user has ADMINISTRATOR permission
          let allServerIds: string[] = []
          let serverRolesMap: Record<string, string[]> = {}
          
          // Discord ADMINISTRATOR permission bit
          const ADMINISTRATOR_PERMISSION = BigInt(0x0000000000000008)
          
          if (guildsResponse.ok) {
            const guilds = await guildsResponse.json()
            
            // Store all servers user is in
            allServerIds = guilds.map((guild: any) => guild.id)
            
            // Filter servers where user is the owner
            ownedServerIds = guilds
              .filter((guild: any) => guild.owner === true)
              .map((guild: any) => guild.id)
            
            // Filter servers where user has ADMINISTRATOR permission
            adminServerIds = guilds
              .filter((guild: any) => {
                if (guild.owner) return true  // Owners are always admins
                const permissions = BigInt(guild.permissions || '0')
                return (permissions & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION
              })
              .map((guild: any) => guild.id)
            
            console.log(`[AUTH] User is admin in ${adminServerIds.length} servers: ${adminServerIds.join(', ')}`)
            
            // Store server names from the guild list
            const serverNames: Record<string, string> = {}
            guilds.forEach((guild: any) => {
              serverNames[guild.id] = guild.name
            })
            
            // Fetch member details only for Discord servers that have guilds in the database
            // This avoids rate limiting from fetching too many servers
            let serverIdsWithGuilds: string[] = []
            let relevantServers: string[] = []
            
            try {
              const { db, guilds } = await import('./db')
              const { sql } = await import('drizzle-orm')
              
              // Get unique Discord server IDs that have guilds configured
              const serversWithGuilds = await db
                .select({ discordGuildId: guilds.discordGuildId })
                .from(guilds)
                .groupBy(guilds.discordGuildId)
              
              serverIdsWithGuilds = serversWithGuilds.map(s => s.discordGuildId)
              
              // Only fetch member data for servers the user is in AND have guilds configured
              relevantServers = allServerIds.filter(id => serverIdsWithGuilds.includes(id))
              
              console.log(`[AUTH] Fetching member data for ${relevantServers.length}/${allServerIds.length} servers with guilds`)
              
              for (const guildId of relevantServers) {
                try {
                  const memberResponse = await fetch(
                    `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
                    {
                      headers: {
                        Authorization: `Bearer ${token.accessToken}`,
                      },
                    }
                  )
                  
                  if (memberResponse.ok) {
                    const member = await memberResponse.json()
                    serverRolesMap[guildId] = member.roles || []
                    
                    // For the main configured server, also set legacy fields
                    if (process.env.DISCORD_GUILD_ID && guildId === process.env.DISCORD_GUILD_ID) {
                      token.userRoles = member.roles || []
                      token.isInGuild = true
                      token.discordNickname = member.nick || null
                    
                      // Update user's custom nickname in database
                      if (member.nick && token.sub) {
                        try {
                          const { db, users } = await import('./db')
                          const { eq } = await import('drizzle-orm')
                          
                          await db.update(users)
                            .set({ customNickname: member.nick })
                            .where(eq(users.discordId, token.sub))
                        } catch (error) {
                          console.error('Error updating user nickname:', error)
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching member data for Discord server ${guildId}:`, error)
                  // Continue to next server on error
                }
              }
            } catch (dbError) {
              console.error('[AUTH] Error querying guilds database:', dbError)
            }
            
            // OPTIMIZATION: Only store relevant server IDs to reduce session cookie size
            // Instead of storing all 49 servers, only store ones with guilds + owned ones
            const relevantServerIds = [...new Set([...relevantServers, ...ownedServerIds.filter((id: string) => serverIdsWithGuilds.includes(id) || relevantServers.length === 0)])]
            const relevantOwnedServerIds = ownedServerIds.filter((id: string) => relevantServerIds.includes(id))
            // Filter admin server IDs to only relevant ones
            const relevantAdminServerIds = adminServerIds.filter((id: string) => relevantServerIds.includes(id))
            
            // Only store server names for relevant servers
            const relevantServerNames: Record<string, string> = {}
            for (const serverId of relevantServerIds) {
              if (serverNames[serverId]) {
                relevantServerNames[serverId] = serverNames[serverId]
              }
            }
            
            token.ownedServerIds = relevantOwnedServerIds
            token.adminServerIds = relevantAdminServerIds  // Store admin server IDs
            token.allServerIds = relevantServerIds
            token.serverNames = relevantServerNames
            
            // IMPORTANT: Store whether user owns ANY server (not just relevant ones)
            // This is used for permission calculations - server owners get elevated access
            token.isAnyServerOwner = ownedServerIds.length > 0
            
            console.log(`[AUTH] Optimized token: storing ${relevantServerIds.length} servers (from ${allServerIds.length} total), owns any server: ${ownedServerIds.length > 0}`)
            
            // Fetch role names using bot token (to avoid user rate limits)
            const roleNames: Record<string, string> = {}
            if (process.env.DISCORD_BOT_TOKEN) {
              for (const [serverId, roleIds] of Object.entries(serverRolesMap)) {
                try {
                  const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${serverId}`, {
                    headers: {
                      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    },
                  })
                  
                  if (guildResponse.ok) {
                    const guildData = await guildResponse.json()
                    const roles = guildData.roles || []
                    
                    for (const roleId of roleIds) {
                      const role = roles.find((r: any) => r.id === roleId)
                      if (role) {
                        roleNames[roleId] = role.name
                      }
                    }
                  }
                } catch (roleError) {
                  console.log(`[AUTH] Could not fetch roles for server ${serverId}`)
                }
              }
              console.log(`[AUTH] Cached ${Object.keys(roleNames).length} role names in session`)
            }
            
            token.roleNames = roleNames
            
            // Aggregate roles from ALL servers with guilds for permission checking
            // This allows users in multiple Discord servers to access resources
            const allUserRoles: string[] = []
            for (const [serverId, roles] of Object.entries(serverRolesMap)) {
              allUserRoles.push(...roles)
            }
            // Remove duplicates
            const uniqueUserRoles = [...new Set(allUserRoles)]
            
            // User is "in guild" if they're in ANY server that has guilds configured
            const isInAnyRelevantServer = Object.keys(serverRolesMap).length > 0
            
            // Set legacy fields - prefer DISCORD_GUILD_ID server if user is in it
            if (process.env.DISCORD_GUILD_ID) {
              const mainGuildId = process.env.DISCORD_GUILD_ID
              if (serverRolesMap[mainGuildId]) {
                // User is in the main configured server - use those roles for display
                token.userRoles = uniqueUserRoles  // But use ALL roles for permission checks
                token.isInGuild = true
              } else if (isInAnyRelevantServer) {
                // User is NOT in main server but IS in other servers with guilds
                // Grant access based on their roles in those servers
                token.userRoles = uniqueUserRoles
                token.isInGuild = true  // They're in a relevant server
                console.log(`[AUTH] User not in DISCORD_GUILD_ID but is in ${Object.keys(serverRolesMap).length} other server(s) with guilds`)
              } else {
                token.userRoles = []
                token.isInGuild = false
                token.discordNickname = null
              }
            } else {
              // No DISCORD_GUILD_ID set - allow access based on any relevant server membership
              token.userRoles = uniqueUserRoles
              token.isInGuild = isInAnyRelevantServer
            }
          }
          
          // Store server roles map in token
          token.serverRolesMap = serverRolesMap
          
          // Log server data in development only
          if (process.env.NODE_ENV === 'development') {
            console.log('Discord auth data:', {
              servers: allServerIds.length,
              ownedServers: ownedServerIds.length,
              nickname: token.discordNickname
            })
          }
        } catch (error) {
          console.error('Error fetching Discord data:', error)
          token.userRoles = []
          token.isInGuild = false
          token.discordNickname = null
          token.ownedServerIds = []
          token.adminServerIds = []
          token.allServerIds = []
          token.serverRolesMap = {}
          token.serverNames = {}
          token.roleNames = {}
          token.isAnyServerOwner = false
        }
        
        // Mark roles as fetched to prevent future API calls (unless explicitly triggered)
        token.rolesFetched = true
        
        // Compute permissions server-side to avoid client-side environment variable issues
        const userRoles = (token.userRoles || []) as string[]
        // Use isAnyServerOwner (owns ANY Discord server) for permission checks
        // This gives server owners elevated access even if their server doesn't have guilds yet
        const isServerOwner = Boolean(token.isAnyServerOwner)
        
        // Check if user is Discord ADMINISTRATOR in any relevant server
        const adminServerIds = (token.adminServerIds || []) as string[]
        const isDiscordAdmin = adminServerIds.length > 0
        
        // Check if user is in ANY relevant server (has guilds configured)
        // This is used as a fallback for basic access when role IDs don't match
        const isInRelevantServer = Boolean(token.isInGuild)
        
        // Check if user is super admin - they get all permissions
        const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
        const isSuperAdmin = superAdminUserId && token.sub === superAdminUserId
        
        const permissions = {
          // Grant basic resource access if user is in a relevant server (even if roles don't match config)
          // This allows cross-server users to access the dashboard
          hasResourceAccess: isSuperAdmin || hasResourceAccess(userRoles, isServerOwner) || isInRelevantServer,
          // Grant admin access to: super admins, Discord ADMINISTRATORS, server owners, or users with configured admin roles
          hasResourceAdminAccess: isSuperAdmin || isDiscordAdmin || hasResourceAdminAccess(userRoles, isServerOwner),
          // Target edit access: super admins, server owners, or users with configured target edit roles
          // NOTE: Discord ADMINISTRATOR is NOT included here - it's checked per-guild in the permissions API
          // This prevents Discord admins in one server from editing targets in other servers' guilds
          hasTargetEditAccess: isSuperAdmin || hasTargetEditAccess(userRoles, isServerOwner),
          // 🆕 Add new permission computations:
          hasReportAccess: isSuperAdmin || hasReportAccess(userRoles),
          hasUserManagementAccess: isSuperAdmin || hasUserManagementAccess(userRoles),
          hasDataExportAccess: isSuperAdmin || hasDataExportAccess(userRoles),
          // True admin = super admin OR role-based admin from DISCORD_ROLES_CONFIG
          // NOT Discord ADMINISTRATOR, NOT server owner, NOT guild leader/officer
          // Used to restrict Bot Dashboard and Admin Panel to actual app admins
          isTrueAdmin: isSuperAdmin || hasResourceAdminAccess(userRoles, false)  // false = don't grant for server owner
        }
        token.permissions = permissions
        
        console.log(`[AUTH] Computed permissions: isDiscordAdmin=${isDiscordAdmin}, adminServers=${adminServerIds.length}`)
        
        // Debug logging for permission troubleshooting
        console.log(`[AUTH] Computed permissions for user ${token.sub}: resourceAccess=${permissions.hasResourceAccess}, isInGuild=${isInRelevantServer}, isServerOwner=${isServerOwner}, roleCount=${userRoles.length}`)
      }

      return token
    },
    async session({ session, token }) {
      // Simply use the cached data from JWT token
      session.user = {
        ...session.user,
        id: token.sub as string, // Discord ID from JWT token
        roles: (token.userRoles || []) as string[],
        isInGuild: Boolean(token.isInGuild),
        discordNickname: token.discordNickname as string | null,
        ownedServerIds: (token.ownedServerIds || []) as string[],
        adminServerIds: (token.adminServerIds || []) as string[],  // Servers where user has ADMINISTRATOR permission
        allServerIds: (token.allServerIds || []) as string[],
        serverRolesMap: (token.serverRolesMap || {}) as Record<string, string[]>,
        serverNames: (token.serverNames || {}) as Record<string, string>,
        roleNames: (token.roleNames || {}) as Record<string, string>,
        // Include pre-computed permissions to avoid client-side env var issues
        permissions: token.permissions as UserPermissions || {
          hasResourceAccess: false,
          hasResourceAdminAccess: false,
          hasTargetEditAccess: false,
          hasReportAccess: false,
          hasUserManagementAccess: false,
          hasDataExportAccess: false,
          isTrueAdmin: false
        }
      }
      
      // Add access token to session for API calls
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken
      }

      return session
    },
  },
  // Remove custom sign-in page for now to avoid conflicts
  // pages: {
  //   signIn: '/auth/signin',
  // },
}

// Helper function to check if user has specific role
export function hasRole(userRoles: string[], requiredRole: string): boolean {
  return userRoles.includes(requiredRole)
}

// Helper function to check if user has any of the required roles
export function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role))
}

// Helper function to get the best display name for a user
export function getDisplayName(user: { 
  name?: string | null
  discordNickname?: string | null
}): string {
  // Priority: Discord nickname > Discord username > fallback
  if (user.discordNickname) return user.discordNickname
  if (user.name) return user.name
  return 'Unknown User'
}

// Helper function to get user identifier for database tracking
export function getUserIdentifier(session: Session): string {
  // Priority: Discord nickname > Discord username > Discord ID (last resort)
  // Always show human-readable names instead of numeric IDs
  if (session.user.discordNickname) return session.user.discordNickname
  if (session.user.name) return session.user.name
  if (session.user.email) return session.user.email
  if (session.user.id) return session.user.id
  return 'Unknown User'
} 