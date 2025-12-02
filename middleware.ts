import { withAuth } from "next-auth/middleware"
import { hasResourceAccess } from './lib/discord-roles'
 
// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/resources',
  '/api/user',
]

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can go here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow public routes
        if (!protectedRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // Check if user is authenticated first
        if (!token) {
          return false
        }
        
        // Use pre-computed permissions from JWT token
        // These are calculated in auth.ts during login and include:
        // - Discord role checks
        // - Server ownership checks
        // - Guild roster membership (if needed)
        const permissions = token.permissions as any
        
        if (!permissions) {
          // Fallback: check basic Discord membership
          return token.isInGuild === true
        }
        
        // Check if user has resource access permission
        return permissions.hasResourceAccess === true
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/resources/:path*']
} 