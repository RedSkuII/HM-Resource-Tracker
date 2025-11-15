# Guild-Specific Role Access Control

## Overview

The bot dashboard now includes the ability to configure which Discord roles can access each in-game guild. This provides fine-grained access control beyond the server-level permissions.

## Features Added

### 1. Database Schema Update
- Added `guild_access_roles` field to the `guilds` table
- Stores a JSON array of Discord role IDs
- Migration applied to production Turso database

### 2. Bot Dashboard UI
- New "Guild Access Roles" section in the bot dashboard
- Expandable cards for each in-game guild
- Multi-select role picker (hold Ctrl/Cmd to select multiple roles)
- Visual role tags showing selected roles
- "Clear All" button to remove all restrictions
- Informative tooltips and help text

### 3. API Endpoints
**New:** `PUT /api/guilds/[guildId]/roles`
- Updates role requirements for a specific guild
- Requires admin access
- Returns updated configuration

**New:** `GET /api/guilds/[guildId]/roles`
- Fetches current role requirements for a guild
- Returns guild info + role IDs

### 4. Access Control Logic
**New file:** `lib/guild-access.ts`

**Functions:**
- `canAccessGuild(guildId, userRoles, hasGlobalAccess)` - Check if user can access a specific guild
- `getAccessibleGuilds(discordServerId, userRoles, hasGlobalAccess)` - Get all accessible guilds for a user

**Integration:**
- `GET /api/resources` - Now checks guild-specific roles before returning resources
- `GET /api/guilds` - Filters guilds list to only show accessible guilds

## How It Works

### Permission Hierarchy
1. **Admin users** (`hasResourceAdminAccess = true`) - Can access ALL guilds, bypassing role checks
2. **Guild-specific roles** - Users need at least ONE of the configured roles to access a guild
3. **No restrictions** - If no roles are configured, ALL users with resource access can view the guild

### User Experience

**Bot Dashboard (Admin View):**
1. Navigate to Bot Dashboard → Select Discord Server
2. Scroll to "Guild Access Roles" section
3. Click on a guild to expand its role configuration
4. Select Discord roles from the dropdown (multi-select)
5. Click "Save Guild Roles"

**Resource Page (User View):**
- Guild dropdown automatically filters to show only accessible guilds
- If user lacks required roles, guild won't appear in dropdown
- Clear error messages if direct access is attempted without proper roles

### Example Scenarios

**Scenario 1: House Leadership Only**
- Guild: "House Melange"
- Required Roles: ["Elder", "Council Member"]
- Result: Only users with Elder OR Council Member role can access this guild's resources

**Scenario 2: Public Guild**
- Guild: "Whitelist Second Guild"
- Required Roles: [] (empty)
- Result: All users with resource access can view this guild

**Scenario 3: Admin Override**
- User: Has "Resource Admin" role
- Guild: Any guild with role restrictions
- Result: Admin can access regardless of guild-specific role requirements

## Technical Details

### Database Schema
```sql
ALTER TABLE guilds ADD COLUMN guild_access_roles TEXT;
```

**Storage Format:**
```json
["1234567890123456789", "9876543210987654321"]
```
(Array of Discord role IDs as JSON string, or NULL for no restrictions)

### Permission Check Flow
```
User requests guild resources
    ↓
Is user admin? → YES → Allow access
    ↓ NO
Fetch guild role requirements
    ↓
No roles configured? → YES → Allow access
    ↓ NO
User has at least one required role? → YES → Allow access
    ↓ NO
Deny access (403 Forbidden)
```

### Performance Considerations
- Guild role checks are cached in the session
- Database queries use indexed lookups
- Minimal overhead for guilds without role restrictions
- Admins bypass all role checks for optimal performance

## Future Enhancements

Potential additions:
- Role hierarchy (require ALL roles vs ANY role)
- Time-based role access
- Audit logs for role changes
- Bulk role assignment across multiple guilds
- Integration with Discord bot commands for role management

## Migration Notes

**Backward Compatibility:**
- Existing guilds default to `null` (no restrictions)
- All existing users maintain their current access
- No breaking changes to existing functionality

**Rollback:**
If needed, the feature can be disabled by:
1. Setting all `guild_access_roles` to `null`
2. The system falls back to server-level permissions

## Testing Checklist

- [x] Database migration applied successfully
- [x] Bot dashboard UI displays correctly
- [x] Role selection saves and persists
- [x] Guild filtering works in resources page
- [x] Admin override functions correctly
- [x] No TypeScript errors
- [ ] End-to-end testing with real Discord roles
- [ ] Mobile responsive design verification
- [ ] Load testing with multiple guilds

## Documentation

See `/dashboard/bot` for the live configuration interface.
Admins can access full documentation by clicking the "Documentation" button in the bot dashboard.
