# GitHub Copilot Instructions for Resource Tracker

## Project Overview

Resource Tracker is a Next.js 14 app for gaming communities to track shared resources (originally for Dune Awakening). It uses Discord OAuth for auth, Turso (SQLite) for data, and implements role-based permissions with a points-based leaderboard system.

**Tech Stack:** Next.js 14 (App Router), TypeScript, NextAuth.js, Drizzle ORM, Turso, Tailwind CSS

## Critical Architecture Patterns

### 1. Discord Role-Based Permission System

**The heart of authorization:** Environment variable `DISCORD_ROLES_CONFIG` contains a JSON array defining role hierarchy and permissions:

```typescript
// lib/discord-roles.ts - Permission checks are centralized here
hasResourceAccess(userRoles: string[]): boolean
hasResourceAdminAccess(userRoles: string[]): boolean  // create/edit/delete resources
hasTargetEditAccess(userRoles: string[]): boolean     // edit target quantities
```

**ALWAYS:**
- Check permissions in API routes using `getServerSession(authOptions)` + role check functions
- Use middleware.ts for route-level protection (already configured for `/dashboard` and `/resources`)
- Compute permissions server-side in JWT callback (`lib/auth.ts`) to avoid client environment issues

### 2. Points & Leaderboard Calculation

Points are calculated in `lib/leaderboard.ts` with specific business rules:

```typescript
// ADD actions: 0.1 points per resource (100 points per 1000 resources)
// SET actions: Flat 1 point (no multipliers)
// REMOVE actions: 0 points
// Refined category: Always 2 points (no multipliers)
// Status bonuses: critical +10%, below_target +5%
```

**When updating resources:** Call `awardPoints()` in `app/api/resources/route.ts` PUT handler after creating history entry.

### 3. Database Schema & Audit Trail

Every resource change creates TWO records:
1. Update `resources` table with new quantity
2. Insert `resource_history` entry with previousQuantity, newQuantity, changeAmount, updatedBy, reason

**Never skip history entries** - they're critical for GDPR compliance and audit trails.

### 4. Session & Token Management

NextAuth session lifecycle (4-hour JWT):
- Initial login fetches Discord roles via API
- Roles cached in JWT token (`lib/auth.ts` jwt callback)
- `rolesFetched` flag prevents redundant API calls
- Use `getUserIdentifier(session)` for database tracking (prioritizes Discord nickname)

## Development Workflows

### Local Setup
```bash
npm install
# Set up .env.local with Discord OAuth + Turso credentials (see ENVIRONMENT.md)
npm run db:push                    # Apply schema to database
npm run populate-resources-safe    # Add sample data
npm run dev
```

### Database Changes
```typescript
// 1. Edit schema in lib/db.ts
// 2. Generate migration
npm run db:generate
// 3. Apply to local DB
npm run db:push
// Note: Turso migrations require running this against TURSO_DATABASE_URL
```

### Adding API Endpoints

**Pattern for protected endpoints:**
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasResourceAccess(session.user.roles)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... endpoint logic
}
```

**Always return with no-cache headers for resource data:**
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
})
```

### Status Calculation

Resource status is computed from `quantity` vs `targetQuantity`:
```typescript
// app/api/resources/route.ts
const calculateResourceStatus = (quantity: number, targetQuantity: number | null) => {
  const percentage = (quantity / targetQuantity) * 100
  if (percentage >= 150) return 'above_target'  // Purple
  if (percentage >= 100) return 'at_target'     // Green
  if (percentage >= 50) return 'below_target'   // Orange
  return 'critical'                             // Red
}
```

## Project-Specific Conventions

### Component Patterns
- **Server Components by default** - Only add `"use client"` when using hooks/state
- **ThemeProvider** wraps root layout for dark/light mode (Tailwind dark: classes)
- **SessionProvider** wraps for NextAuth access
- Export named functions, not defaults: `export function ComponentName()`

### ID Generation
Use `nanoid()` from 'nanoid' package for all primary keys (not UUIDs).

### Error Handling
```typescript
try {
  // ... operation
} catch (error) {
  console.error('Descriptive error message:', error)
  return NextResponse.json({ error: 'User-friendly message' }, { status: 500 })
}
```

### TypeScript Patterns
- Extend NextAuth types in `types/next-auth.d.ts` for session customization
- Use Drizzle's `eq()`, `and()`, `desc()` helpers from 'drizzle-orm' for queries
- Prefer `integer('field', { mode: 'timestamp' })` for dates in schema

## Common Pitfalls

1. **DISCORD_ROLES_CONFIG must be single-line JSON** in Vercel env vars (no newlines/spaces)
2. **Don't forget `updatedAt` and `lastUpdatedBy`** when updating resources
3. **Resource history `changeType`** is `'absolute'` for SET operations, `'relative'` for ADD/REMOVE
4. **Status bonuses only apply to ADD actions**, not SET or REMOVE
5. **Middleware only protects dashboard/resources routes** - API routes need explicit auth checks
6. **Use `getUserIdentifier(session)` not `session.user.name`** for consistent user tracking

## Key Files Reference

- `lib/auth.ts` - NextAuth config, session callbacks, permission helpers
- `lib/discord-roles.ts` - Permission checking logic, role hierarchy parsing
- `lib/leaderboard.ts` - Points calculation formulas and leaderboard queries
- `lib/db.ts` - Drizzle schema definitions
- `middleware.ts` - Route-level auth protection
- `app/api/resources/route.ts` - Main resource CRUD with points integration
- `ENVIRONMENT.md` - Complete env var documentation and troubleshooting

## Testing Checklist

When making changes:
- [ ] Test with different Discord role configurations
- [ ] Verify points calculation for ADD/SET/REMOVE actions
- [ ] Check resource history entries are created
- [ ] Test both light and dark themes
- [ ] Verify responsive design (mobile/tablet/desktop)
- [ ] Ensure no-cache headers on resource endpoints
- [ ] Test with user lacking permissions (should see 401/403)

## Deployment Notes

**Vercel-specific:**
- Environment variables MUST use single-line format for JSON values
- Use Vercel CLI (`vercel env add`) for complex env vars
- Database migrations run automatically on deploy if using `npm run db:push` in build command
- Edge Runtime compatible - no Node.js-specific APIs in API routes
