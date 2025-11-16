# Permissions and Roles Reference Guide

## Table of Contents
- [Overview](#overview)
- [Permission Hierarchy](#permission-hierarchy)
- [Website Permissions](#website-permissions)
- [Discord Bot Permissions](#discord-bot-permissions)
- [Guild-Specific Access Control](#guild-specific-access-control)
- [Bot Dashboard Settings](#bot-dashboard-settings)
- [Command Reference](#command-reference)
- [API Endpoint Permissions](#api-endpoint-permissions)

---

## Overview

Resource Tracker uses a **dual permission system**:
1. **Global Discord Role Configuration** (`DISCORD_ROLES_CONFIG`) - Controls website access
2. **Per-Guild Role Configuration** - Controls access to specific in-game guilds

### Key Concepts
- **Discord Server Owner**: Automatic admin access to everything
- **Global Permissions**: Set via environment variable, controls website features
- **Guild-Specific Permissions**: Set per in-game guild, controls data access
- **Bot Admin Roles**: Can be configured separately for bot dashboard access

---

## Permission Hierarchy

### Highest to Lowest Priority

1. **Discord Server Owner** 👑
   - Owns the Discord server in Discord settings
   - Has ALL permissions automatically
   - Cannot be restricted
   - Access: Everything

2. **Global Resource Admin** (via `DISCORD_ROLES_CONFIG` with `isAdmin: true`)
   - Full access to all in-game guilds
   - Can create/edit/delete resources
   - Can configure guild settings
   - Can manage bot dashboard
   - Access: Everything except Discord server settings

3. **Global Target Edit** (via `DISCORD_ROLES_CONFIG` with `canEditTargets: true`)
   - Can edit target quantities for resources
   - Can view all resources
   - Cannot create/delete resources
   - Access: Target editing across all guilds

4. **Guild Officer** (via per-guild `guildOfficerRoles`)
   - Can edit resources for THEIR assigned guild(s) only
   - Can view their guild's data
   - Cannot configure guild settings
   - Access: Edit resources in assigned guilds

5. **Guild Member** (via per-guild `guildAccessRoles` or `defaultRoleId`)
   - Can VIEW resources for THEIR assigned guild(s) only
   - Cannot edit anything
   - Read-only access
   - Access: View resources in assigned guilds

6. **Basic Resource Access** (via `DISCORD_ROLES_CONFIG` with `canAccessResources: true`)
   - Can access the website
   - Sees only guilds they have specific access to
   - No admin functions
   - Access: Website login + guild-filtered content

7. **No Permissions**
   - Can log in with Discord
   - Sees "No Guilds Available" or permission denied errors
   - Access: None

---

## Website Permissions

### Configured via `DISCORD_ROLES_CONFIG` Environment Variable

```typescript
type RoleConfig = {
  id: string                      // Discord role ID
  name: string                    // Display name
  level: number                   // Hierarchy level (higher = more priority)
  isAdmin?: boolean               // Full admin access to all guilds
  canEditTargets?: boolean        // Can edit target quantities
  canAccessResources?: boolean    // Basic website access
  canManageBotSettings?: boolean  // Access to bot dashboard
  canViewReports?: boolean        // Future: Analytics access
  canManageUsers?: boolean        // Future: User management
  canExportData?: boolean         // Future: Data export
}
```

### Permission Functions Reference

| Function | Environment Config | Checks | Grants Access To |
|----------|-------------------|--------|------------------|
| `hasResourceAccess()` | `canAccessResources: true` | Basic website login | Website access, view allowed guilds |
| `hasResourceAdminAccess()` | `isAdmin: true` | Full admin powers | Create/edit/delete resources, all guilds, configurations |
| `hasTargetEditAccess()` | `canEditTargets: true` | Target editing | Edit target quantities, view all resources |
| `hasBotAdminAccess()` | `canManageBotSettings: true` | Bot configuration | Bot dashboard, settings, integrations |

**Special Cases:**
- If `DISCORD_ROLES_CONFIG` is empty/not set: All permissions default to **true** (open access)
- Discord Server Owners **always** pass all permission checks (bypass role requirements)
- Permissions are cached in JWT session (4-hour lifetime)

### Example Configuration

```json
[
  {
    "id": "123456789",
    "name": "Guild Master",
    "level": 100,
    "isAdmin": true,
    "canEditTargets": true,
    "canAccessResources": true,
    "canManageBotSettings": true
  },
  {
    "id": "987654321",
    "name": "Officer",
    "level": 50,
    "canEditTargets": true,
    "canAccessResources": true
  },
  {
    "id": "555555555",
    "name": "Member",
    "level": 10,
    "canAccessResources": true
  }
]
```

---

## Discord Bot Permissions

### Bot Command Access Control

The Discord bot uses **separate permission checking** from the website:

#### 1. **Discord Server Administrator** (Discord Permission)
- Can use ALL setup commands
- Required for `/setup-*` commands
- Cannot be overridden by bot configuration

**Commands:**
- `/setup-view` - View all configuration
- `/setup-admins` - Manage bot admin roles
- `/setup-guild-access` - Configure guild viewer roles
- `/setup-guild-officers` - Configure guild editor roles
- `/enable-function` / `/disable-function` - Toggle features

---

#### 2. **Bot Admin Roles** (Configured via `/setup-admins`)
- Access to ALL in-game guilds
- Can edit KOS, resources, guild rosters
- Cannot use setup commands (requires Discord Admin)

**Commands:**
- All guild management commands for any guild
- `/add-kos`, `/remove-kos` for any guild
- `/upload-link`, `/edit-resource`, `/remove-resource` for any guild
- `/link-guild-resources` - Copy resources between guilds

---

#### 3. **Guild Officer Roles** (Configured via `/setup-guild-officers <guild>`)
- Can EDIT data for their assigned guild(s) only
- Automatically get viewer access to their guilds

**Commands (for assigned guilds only):**
- `/add-kos <guild>` - Add to KOS list
- `/remove-kos <guild>` - Remove from KOS
- `/upload-link <guild>` - Add resource
- `/edit-resource <guild>` - Edit resource
- `/remove-resource <guild>` - Remove resource

---

#### 4. **Guild Access Roles** (Configured via `/setup-guild-access <guild>`)
- Can VIEW data for their assigned guild(s) only
- Read-only access

**Commands (for assigned guilds only):**
- `/kos [guild]` - View KOS list
- `/resource-links [guild]` - Browse resources
- `/guild-info <guild>` - View guild roster

---

#### 5. **Default Role** (Optional, per guild via `/setup-guild-default <guild>`)
- Legacy: View-only access for one specific role
- **Deprecated** in favor of Guild Access Roles

---

#### 6. **Function Toggles** (via `/enable-function` / `/disable-function`)

Can disable entire categories of commands server-wide:

| Function | Affects |
|----------|---------|
| `help` | `/command-list` |
| `kos` | All KOS commands |
| `stock` | `/stock`, `/edit-stock` |
| `orders` | All order commands |
| `guilds` | All guild roster commands |
| `resources` | All resource directory commands |

**Default:** All functions enabled

---

## Guild-Specific Access Control

### Per In-Game Guild Configuration

Each in-game guild can have **independent role requirements**:

1. **Guild Access Roles** (`guildAccessRoles`)
   - JSON array of Discord role IDs
   - Users with ANY of these roles can VIEW the guild's data
   - If empty/null: All users with basic website access can view
   - Configured via Bot Dashboard or `/setup-guild-access`

2. **Guild Officer Roles** (`guildOfficerRoles`)
   - JSON array of Discord role IDs
   - Users with ANY of these roles can EDIT the guild's data
   - Officers automatically get viewer access
   - Configured via Bot Dashboard or `/setup-guild-officers`

3. **Default Role** (`defaultRoleId`)
   - Single Discord role ID (legacy)
   - Users with this role can VIEW the guild's data
   - **Deprecated** in favor of Guild Access Roles array

### Access Logic

```typescript
function canAccessGuild(guildId, userRoles, isGlobalAdmin) {
  // Admins bypass all checks
  if (isGlobalAdmin) return true
  
  // Get guild configuration
  const guild = getGuild(guildId)
  
  // No role requirements = open access
  if (!guild.guildAccessRoles || guild.guildAccessRoles.length === 0) {
    return true
  }
  
  // Check if user has ANY required role
  const hasRole = guild.guildAccessRoles.some(roleId => 
    userRoles.includes(roleId)
  )
  
  return hasRole
}
```

### Example Multi-Guild Setup

**Scenario:** Discord server manages 2 in-game guilds

**Guild 1: "House Melange"**
- Access Roles: `@Melange Members`, `@Melange Officers`
- Officer Roles: `@Melange Officers`

**Guild 2: "Whitelist Second Guild"**
- Access Roles: `@Whitelist Members`, `@Whitelist Officers`
- Officer Roles: `@Whitelist Officers`

**User with `@Melange Members` role:**
- Can VIEW House Melange resources ✅
- Cannot edit House Melange ❌
- Cannot see Whitelist Guild ❌

**User with both `@Melange Officers` and `@Whitelist Members` roles:**
- Can EDIT House Melange resources ✅
- Can VIEW Whitelist Guild resources ✅
- Cannot edit Whitelist Guild ❌

**User with Global Admin (`DISCORD_ROLES_CONFIG` `isAdmin: true`):**
- Can access and edit BOTH guilds ✅✅

---

## Bot Dashboard Settings

### `/dashboard/bot` Page Permissions

**Access Requirements:**
- Must be logged in with Discord
- Must have `hasResourceAdminAccess` OR be Discord Server Owner
- Sees only Discord servers where they have Administrator permission or ownership

### Configuration Options

#### 1. **Server Selection**
- Dropdown shows user's Discord servers
- Servers with bot installed shown first (✅)
- Servers without bot shown with warning (⚠️)
- Owner servers marked with crown (👑)

#### 2. **In-Game Guild Selection**
- Dropdown shows guilds linked to selected Discord server
- Only shows guilds user has permission to configure
- Required before saving any settings

#### 3. **Bot Channels** (Multi-select)
- Channels where bot posts notifications
- Requires at least one channel or leave empty
- Used for: Website change notifications, alerts

#### 4. **Order Channels** (Multi-select)
- Channels where orders can be created/filled
- Optional
- Used for: Discord-based resource requests

#### 5. **Admin Roles** (Multi-select)
- Roles that can access bot dashboard on website
- Independent from bot command admin roles
- Used for: Website bot configuration access

#### 6. **Order Fulfillment Bonus** (0-200%)
- Multiplies points for filling orders via Discord bot
- Default: 50% (1.5x points)
- Examples:
  - `0%` = No bonus (1.0x)
  - `50%` = +50% bonus (1.5x)
  - `100%` = Double points (2.0x)
  - `200%` = Triple points (3.0x)

#### 7. **Website Bonus** (0-200%)
- Multiplies points for adding resources via website
- Default: 0% (no bonus)
- Same scaling as order bonus

#### 8. **Auto-Update Embeds** (Toggle)
- **ON**: Bot edits existing embed messages when data changes
- **OFF**: Bot creates new messages for each update
- Default: ON
- Use case: Keep pinned messages synchronized

#### 9. **Notify on Website Changes** (Toggle)
- **ON**: Bot posts Discord notification when website is used
- **OFF**: Only Discord bot actions trigger notifications
- Default: ON
- Use case: Keep Discord community informed

#### 10. **Allow Public Orders** (Toggle)
- **ON**: Any guild member can create orders via bot
- **OFF**: Only bot admins can manage orders
- Default: ON
- Use case: Democratic vs centralized resource distribution

---

## Command Reference

### Website-Only Functions

| Function | Requires | Purpose |
|----------|----------|---------|
| View Resources | `hasResourceAccess()` + guild access | Browse resource lists |
| Add Resources | `hasResourceAccess()` + guild access | Add to stock via website |
| Edit Resource Quantity | `hasResourceAccess()` + guild access | Change quantities |
| Create Resource (New Item) | `hasResourceAdminAccess()` | Add new resource types |
| Delete Resource | `hasResourceAdminAccess()` | Remove resources |
| Edit Target Quantity | `hasTargetEditAccess()` | Set min/max thresholds |
| View Leaderboard | `hasResourceAccess()` | See points and rankings |
| View Activity Log | `hasResourceAccess()` | See change history |
| Export User Data (GDPR) | `hasResourceAccess()` | Download personal data |
| Delete User Data (GDPR) | `hasResourceAccess()` | Anonymize account |
| Access Bot Dashboard | `hasBotAdminAccess()` OR Server Owner | Configure bot settings |

### Discord Bot Commands

#### Setup Commands (Discord Administrator Required)
- `/setup-view` - View all server configuration
- `/setup-admins add/remove @role` - Manage bot admin roles
- `/setup-guild-access <guild> add/remove @role` - Configure guild viewers
- `/setup-guild-officers <guild> add/remove @role` - Configure guild editors
- `/enable-function <name>` - Enable command category
- `/disable-function <name>` - Disable command category

#### Guild Management (Bot Admin Only)
- `/add-guild <name> <description>` - Create in-game guild
- `/edit-guild <guild>` - Modify guild details
- `/delete-guild <guild>` - Remove guild
- `/add-guildie <guild> <member>` - Add member to roster
- `/remove-guildie <guild> <member>` - Remove member
- `/set-leader <guild> <member>` - Assign guild leader
- `/set-officer <guild> <member>` - Assign guild officer
- `/prune-guild <guild>` - Remove members who left Discord

#### Guild-Specific Commands

**Officers & Admins:**
- `/add-kos <guild> <target>` - Add to KOS list
- `/remove-kos <guild> <target>` - Remove from KOS
- `/upload-link <guild> <title> <url> [category]` - Add resource link
- `/edit-resource <guild> <resource>` - Edit resource
- `/remove-resource <guild> <resource>` - Delete resource

**All Members with Guild Access:**
- `/kos [guild]` - View KOS list (no guild = all accessible guilds)
- `/resource-links [guild] [category] [search]` - Browse resources
- `/guild-info <guild>` - View roster

**Admins Only:**
- `/link-guild-resources <source_guild> <resource_id> <target_guild>` - Copy resource

#### Stock & Orders (If Enabled)
- `/stock` - View inventory
- `/edit-stock` - Interactive stock management
- `/order create <item> <quantity>` - Request resources (if public orders ON)
- `/fill <order_id>` - Fulfill order
- `/list-orders` - View pending orders
- `/edit-order <order_id>` - Modify order (admin)
- `/delete-order <order_id>` - Cancel order (admin)

#### Help
- `/command-list` - Show available commands (based on user's permissions)

---

## API Endpoint Permissions

### Authentication Requirements

All API endpoints require NextAuth session except:
- `/api/auth/*` - Authentication endpoints
- Public endpoints (none currently)

### Endpoint Permission Matrix

| Endpoint | Method | Requires | Purpose |
|----------|--------|----------|---------|
| `/api/resources` | GET | `hasResourceAccess()` + guild access | List resources |
| `/api/resources` | POST | `hasResourceAdminAccess()` | Create new resource type |
| `/api/resources` | PUT | `hasResourceAccess()` + guild access | Update resource quantity |
| `/api/resources/[id]` | GET | `hasResourceAccess()` + guild access | Get resource details |
| `/api/resources/[id]` | PUT | `hasResourceAccess()` + guild access | Update resource |
| `/api/resources/[id]` | DELETE | `hasResourceAdminAccess()` | Delete resource |
| `/api/resources/[id]/target` | PUT | `hasTargetEditAccess()` | Update target quantity |
| `/api/resources/[id]/history` | GET | `hasResourceAccess()` | View change history |
| `/api/leaderboard` | GET | Authenticated session | View leaderboard |
| `/api/leaderboard/[userId]` | DELETE | Own user or admin | Clear user points |
| `/api/user/activity` | GET | `hasResourceAccess()` | View own activity |
| `/api/user/data-export` | GET | `hasResourceAccess()` | Export GDPR data |
| `/api/user/data-deletion` | POST | `hasResourceAccess()` | Request data deletion |
| `/api/guilds` | GET | `hasResourceAdminAccess()` | List all guilds |
| `/api/guilds` | POST | `hasResourceAdminAccess()` | Create guild |
| `/api/guilds/[id]/roles` | PUT | `hasResourceAdminAccess()` | Configure guild roles |
| `/api/guilds/[id]/config` | GET/PUT | Authenticated session | Guild configuration |
| `/api/guilds/[id]/delete-guild` | DELETE | `hasResourceAdminAccess()` | Delete guild |
| `/api/guilds/[id]/delete-resources` | DELETE | `hasResourceAdminAccess()` | Bulk delete resources |
| `/api/bot/config/[guildId]` | GET | Authenticated session | Bot reads config |
| `/api/bot/config/[guildId]` | PUT | `hasBotAdminAccess()` | Bot updates config |
| `/api/discord/guild/[guildId]` | GET | Authenticated session | Discord server info |
| `/api/discord/user-servers` | GET | Authenticated session | User's Discord servers |
| `/api/discord/roles` | GET | Authenticated session | User's Discord roles |

**Notes:**
- Guild access checked via `canAccessGuild()` - requires matching guild-specific roles
- Server Owners bypass all permission checks
- Failed permission checks return `401 Unauthorized` or `403 Forbidden`

---

## Permission Troubleshooting

### "You don't have permission to access this resource"

**Cause:** Missing `canAccessResources` in `DISCORD_ROLES_CONFIG`

**Solution:**
```json
{
  "id": "YOUR_ROLE_ID",
  "name": "Member",
  "level": 10,
  "canAccessResources": true  // Add this
}
```

### "No Guilds Available" in dropdown

**Causes:**
1. No guilds created yet
2. User lacks guild-specific access roles
3. Global admin access missing

**Solutions:**
1. Create guild via Bot Dashboard
2. Add user's role to guild's `guildAccessRoles`
3. Give user `isAdmin: true` in `DISCORD_ROLES_CONFIG`

### "Cannot edit target quantity"

**Cause:** Missing `canEditTargets` permission

**Solution:**
```json
{
  "id": "YOUR_ROLE_ID",
  "canEditTargets": true  // Add this
}
```

### Bot commands show "Function not enabled"

**Cause:** Function disabled via `/disable-function`

**Solution:**
```
/enable-function kos
/enable-function stock
/enable-function orders
/enable-function resources
/enable-function guilds
/enable-function help
```

### "You don't have permission to view this guild" (Bot)

**Cause:** Missing guild-specific role

**Solution:**
```
/setup-guild-access "Guild Name" add @YourRole
```

### Officers can't edit resources (Bot)

**Cause:** Not configured as guild officer

**Solution:**
```
/setup-guild-officers "Guild Name" add @OfficerRole
```

---

## Quick Reference Cheat Sheet

### I want to...

**Let users VIEW the website:**
```json
{"canAccessResources": true}
```

**Let users EDIT all resources:**
```json
{"isAdmin": true}
```

**Let users edit target quantities only:**
```json
{"canEditTargets": true}
```

**Let users configure bot settings:**
```json
{"canManageBotSettings": true}
```

**Let users VIEW one specific guild:**
- Bot Dashboard → Guild Settings → Guild Access Roles → Add role
- OR `/setup-guild-access "Guild Name" add @Role`

**Let users EDIT one specific guild:**
- Bot Dashboard → Guild Settings → Guild Officer Roles → Add role
- OR `/setup-guild-officers "Guild Name" add @Role`

**Make someone a bot admin (can edit any guild):**
```
/setup-admins add @Role
```

**Allow anyone to create Discord orders:**
- Bot Dashboard → Allow Public Orders → ON

**Disable Discord order creation:**
- Bot Dashboard → Allow Public Orders → OFF

---

## Best Practices

1. **Principle of Least Privilege**: Give minimum permissions needed
2. **Separate Roles**: Don't use same role for global admin and guild member
3. **Document Your Setup**: Keep track of which roles do what
4. **Test Permissions**: Verify with test user before deploying
5. **Regular Audits**: Review permissions monthly with `/setup-view`
6. **Use Guild-Specific Roles**: Prefer guild access roles over global admin for most users
7. **Protect Admin Roles**: Limit `isAdmin: true` to trusted leadership
8. **Enable Functions Selectively**: Disable unused bot features

---

## Summary

**Global Permissions** (via `DISCORD_ROLES_CONFIG`):
- Controls website access and admin features
- Applies across all guilds
- Required: `canAccessResources` for basic access

**Guild-Specific Permissions**:
- Controls access to individual in-game guilds
- Configured per guild via Bot Dashboard or bot commands
- Independent: User can have access to some guilds but not others

**Bot Dashboard Settings**:
- Controls bot behavior and integrations
- Requires `hasBotAdminAccess()` or Server Owner
- Independent from resource permissions

**Discord Server Owner**:
- Bypasses all permission checks
- Has full access to everything
- Cannot be restricted
