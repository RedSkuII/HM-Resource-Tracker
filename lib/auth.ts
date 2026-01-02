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
          let allServerIds: string[] = []
          let serverRolesMap: Record<string, string[]> = {}
          
          if (guildsResponse.ok) {
            const guilds = await guildsResponse.json()
            
            // Store all servers user is in
            allServerIds = guilds.map((guild: any) => guild.id)
            
            // Filter servers where user is the owner
            ownedServerIds = guilds
              .filter((guild: any) => guild.owner === true)
              .map((guild: any) => guild.id)
            
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
            
            // Only store server names for relevant servers
            const relevantServerNames: Record<string, string> = {}
            for (const serverId of relevantServerIds) {
              if (serverNames[serverId]) {
                relevantServerNames[serverId] = serverNames[serverId]
              }
            }
            
            token.ownedServerIds = relevantOwnedServerIds
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
            
            // Set legacy fields based on DISCORD_GUILD_ID or first server
            if (process.env.DISCORD_GUILD_ID) {
              const mainGuildId = process.env.DISCORD_GUILD_ID
              if (serverRolesMap[mainGuildId]) {
                token.userRoles = serverRolesMap[mainGuildId]
                token.isInGuild = true
              } else {
                token.userRoles = []
                token.isInGuild = false
                token.discordNickname = null
              }
            } else {
              // No DISCORD_GUILD_ID set - allow access based on server ownership
              token.userRoles = []
              token.isInGuild = relevantServerIds.length > 0
            }
          }
          
          // Store server roles map in token
          token.serverRolesMap = serverRolesMap
          
          // Log server data in development only
          if (process.env.NODE_ENV === 'development') {
            console.log('Discord auth data:', {
              servers: relevantServerIds.length,
              ownedServers: relevantOwnedServerIds.length,
              nickname: token.discordNickname
            })
          }
        } catch (error) {
          console.error('Error fetching Discord data:', error)
          token.userRoles = []
          token.isInGuild = false
          token.discordNickname = null
          token.ownedServerIds = []
          token.allServerIds = []
          token.serverRolesMap = {}
          token.serverNames = {}
          token.roleNames = {}
        }
        
        // Mark roles as fetched to prevent future API calls (unless explicitly triggered)
        token.rolesFetched = true
        
        // Compute permissions server-side to avoid client-side environment variable issues
        const userRoles = (token.userRoles || []) as string[]
        // Use isAnyServerOwner (owns ANY Discord server) for permission checks
        // This gives server owners elevated access even if their server doesn't have guilds yet
        const isServerOwner = Boolean(token.isAnyServerOwner)
        
        // Check if user is super admin - they get all permissions
        const superAdminUserId = process.env.SUPER_ADMIN_USER_ID
        const isSuperAdmin = superAdminUserId && token.sub === superAdminUserId
        
        token.permissions = {
          hasResourceAccess: isSuperAdmin || hasResourceAccess(userRoles, isServerOwner),
          hasResourceAdminAccess: isSuperAdmin || hasResourceAdminAccess(userRoles, isServerOwner),
          hasTargetEditAccess: isSuperAdmin || hasTargetEditAccess(userRoles, isServerOwner),
          // 🆕 Add new permission computations:
          hasReportAccess: isSuperAdmin || hasReportAccess(userRoles),
          hasUserManagementAccess: isSuperAdmin || hasUserManagementAccess(userRoles),
          hasDataExportAccess: isSuperAdmin || hasDataExportAccess(userRoles)
        }
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
          hasDataExportAccess: false
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