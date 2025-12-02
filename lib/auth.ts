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
            
            token.ownedServerIds = ownedServerIds
            token.allServerIds = allServerIds
            
            // Only fetch member details for the configured Discord server (if set)
            // This prevents timeout issues from fetching too many servers
            if (process.env.DISCORD_GUILD_ID) {
              const guildId = process.env.DISCORD_GUILD_ID
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
                } else {
                  // User not in the configured Discord server
                  token.userRoles = []
                  token.isInGuild = false
                  token.discordNickname = null
                }
              } catch (error) {
                console.error(`Error fetching member data for Discord server:`, error)
                token.userRoles = []
                token.isInGuild = false
              }
            } else {
              // No DISCORD_GUILD_ID set - allow access based on server ownership
              token.userRoles = []
              token.isInGuild = allServerIds.length > 0
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
          token.allServerIds = []
          token.serverRolesMap = {}
        }
        
        // Mark roles as fetched to prevent future API calls (unless explicitly triggered)
        token.rolesFetched = true
        
        // Compute permissions server-side to avoid client-side environment variable issues
        const userRoles = (token.userRoles || []) as string[]
        const ownedServers = (token.ownedServerIds || []) as string[]
        const isServerOwner = ownedServers.length > 0
        
        token.permissions = {
          hasResourceAccess: hasResourceAccess(userRoles, isServerOwner),
          hasResourceAdminAccess: hasResourceAdminAccess(userRoles, isServerOwner),
          hasTargetEditAccess: hasTargetEditAccess(userRoles, isServerOwner),
          // 🆕 Add new permission computations:
          hasReportAccess: hasReportAccess(userRoles),
          hasUserManagementAccess: hasUserManagementAccess(userRoles),
          hasDataExportAccess: hasDataExportAccess(userRoles)
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