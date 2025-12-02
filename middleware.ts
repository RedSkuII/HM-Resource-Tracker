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
        
        // Check if user owns any Discord servers
        const ownedServerIds = (token.ownedServerIds as string[]) || []
        const isServerOwner = ownedServerIds.length > 0
        
        // Check if user has required roles or is a server owner
        const userRoles = (token.userRoles as string[]) || []
        return hasResourceAccess(userRoles, isServerOwner)
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/resources/:path*']
} 