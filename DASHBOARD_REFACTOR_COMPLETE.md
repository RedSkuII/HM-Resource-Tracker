# Dashboard Refactor to Guild-Specific Configuration - COMPLETE ✅

**Date:** January 2025  
**Status:** Dashboard refactor complete, database migration REQUIRED before deployment

## What Was Done

### 1. Dashboard UI Refactoring (✅ COMPLETE)
- **Removed server-level configuration** - All settings are now guild-specific
- **Updated all form sections:**
  - ✅ Bot Channels
  - ✅ Order Channels
  - ✅ Bonuses (Order Fulfillment, Website)
  - ✅ Checkboxes (Auto-update, Notify, Public Orders)
  - ✅ Admin Roles
  - ✅ Guild Officer Roles
  - ✅ Guild Access Roles
  - ✅ Delete All Resources

### 2. State Management (✅ COMPLETE)
- Changed from `config.inGameGuildId` to `selectedInGameGuildId`
- Settings stored directly in `InGameGuild` interface
- Guild dropdown triggers config fetch via `fetchGuildConfig()`
- All form bindings use: `inGameGuilds.find(g => g.id === selectedInGameGuildId)?.fieldName`

### 3. API Integration (✅ COMPLETE)
- Save function now POSTs to `/api/guilds/[guildId]/config`
- Delete function uses `selectedInGameGuildId`
- Removed old `/api/bot/config/[guildId]` references

### 4. Code Cleanup (✅ COMPLETE)
- Deprecated `BotConfig` interface (commented out)
- Removed `config` state variable (commented out)
- Removed old `fetchConfig` useEffect
- All TypeScript errors resolved
- Build passes successfully

## What Still Needs to Be Done

### ⚠️ CRITICAL - Database Migration (NOT YET RUN)

**File:** `drizzle/0013_parched_tempest.sql`

**What it does:**
Adds 8 new columns to the `guilds` table to store bot configuration:
- `bot_channel_id` (TEXT) - JSON array
- `order_channel_id` (TEXT) - JSON array
- `admin_role_id` (TEXT) - JSON array
- `auto_update_embeds` (INTEGER/boolean, default: true)
- `notify_on_website_changes` (INTEGER/boolean, default: true)
- `order_fulfillment_bonus` (INTEGER, default: 50)
- `website_bonus_percentage` (INTEGER, default: 0)
- `allow_public_orders` (INTEGER/boolean, default: true)

**How to run:**

```bash
# Option 1: Using Drizzle Push (recommended)
npm run db:push

# Option 2: Manual SQL execution
# 1. Copy contents of drizzle/0013_parched_tempest.sql
# 2. Run against Turso database:
turso db shell hm-resources-tracker < drizzle/0013_parched_tempest.sql
```

**Why it's critical:**
Without this migration:
- New API endpoint `/api/guilds/[guildId]/config` will fail (missing columns)
- Dashboard Save button will fail when clicked
- Guild-specific settings cannot be stored

### 📋 Testing Checklist (After Migration)

1. **Select Discord Server** → Should load guilds list
2. **Select Guild 1** → Configure bot channels, admin roles, bonuses
3. **Click Save Configuration** → Should save successfully
4. **Switch to Guild 2** → Should show empty/different configuration
5. **Configure Guild 2 differently** → Save should work
6. **Switch back to Guild 1** → Should restore original configuration
7. **Test all form sections:**
   - Bot Channels multi-select
   - Order Channels multi-select
   - Admin Roles multi-select
   - Guild Officer Roles multi-select
   - Guild Access Roles multi-select
   - Bonus sliders (Order Fulfillment, Website)
   - Checkboxes (Auto-update, Notify, Public Orders)
   - Delete All Resources (owners only)

### 🤖 Bot Updates (Future Work)

**File:** `TRZBot/cogs/server_config.py` (or similar)

**What needs updating:**
- Bot needs to fetch guild-specific channels (not server-level)
- Bot commands need to check guild-specific admin roles
- Bot notifications need to use guild-specific channels
- Bot needs to read from guilds table instead of discordBotConfigs

**Migration strategy for bot:**
1. Run database migration first
2. Manually configure one guild via dashboard
3. Update bot code to read from `guilds` table
4. Test bot notifications/commands with that guild
5. Roll out to other guilds

## Architecture Changes

### Before (Server-Level Config)
```
Discord Server (e.g., "My Server")
├── Bot Config (single, applies to whole server)
│   ├── Bot Channel: #bot-notifications
│   ├── Order Channel: #orders
│   └── Admin Roles: @Admin
└── In-Game Guilds
    ├── House Melange (shares server config)
    ├── Whitelist Guild (shares server config)
    └── Test Guild (shares server config)
```

### After (Guild-Specific Config) ✅
```
Discord Server (e.g., "My Server")
└── In-Game Guilds
    ├── House Melange
    │   ├── Bot Channel: #melange-notifications
    │   ├── Order Channel: #melange-orders
    │   ├── Admin Roles: @Melange-Admin
    │   └── Bonuses: 50% order, 10% website
    ├── Whitelist Guild
    │   ├── Bot Channel: #whitelist-notifications
    │   ├── Order Channel: #whitelist-orders
    │   ├── Admin Roles: @Whitelist-Admin
    │   └── Bonuses: 100% order, 0% website
    └── Test Guild
        ├── Bot Channel: #test-notifications
        ├── Order Channel: #test-orders
        ├── Admin Roles: @Test-Admin
        └── Bonuses: 0% order, 0% website
```

## Benefits

1. **Complete Guild Separation** - Each guild has independent configuration
2. **Multi-Guild Support** - Run multiple guilds on same Discord server
3. **Flexible Permissions** - Different admin roles per guild
4. **Custom Bonuses** - Different point bonuses per guild
5. **Scalability** - Easy to add new guilds without affecting existing ones

## Files Modified

### Database
- `lib/db.ts` - Extended `guilds` table with 8 new columns
- `drizzle/0013_parched_tempest.sql` - Migration file (NOT YET EXECUTED)

### API
- `app/api/guilds/[guildId]/config/route.ts` - New endpoint for guild config (GET/PUT)

### Dashboard
- `app/dashboard/bot/page.tsx` - Complete refactor to use guild-specific state

### Documentation
- `GUILD_SPECIFIC_CONFIG_REFACTOR.md` - Technical refactor guide
- `DASHBOARD_REFACTOR_COMPLETE.md` - This file

## Commit History

1. `98a34e3` - WIP: Start refactoring dashboard to use guild-specific config (bot channels updated)
2. `66b0df2` - Complete dashboard refactor to use guild-specific config

## Next Steps

### Immediate (Before Deployment)
1. ⚠️ **Run database migration** (`npm run db:push`)
2. ⚠️ **Test guild switching** in dashboard
3. ⚠️ **Verify save functionality** works
4. ⚠️ **Test with multiple guilds** to ensure separation

### Future (TRZBot Updates)
1. Update bot to read guild-specific config
2. Test bot notifications with new config
3. Remove deprecated `discordBotConfigs` table
4. Update bot documentation

## Rollback Plan

If something goes wrong:

1. **Revert dashboard changes:**
   ```bash
   git revert 66b0df2 98a34e3
   git push origin main
   ```

2. **Rollback database migration:**
   - Execute DROP COLUMN statements for the 8 new columns
   - Or restore from backup (if available)

3. **Restore old API endpoint:**
   - Re-enable `/api/bot/config/[guildId]`

## Support

If you encounter issues:

1. Check TypeScript errors: `npm run build`
2. Check API responses in browser DevTools Network tab
3. Check database schema: `npm run db:studio`
4. Review migration file: `drizzle/0013_parched_tempest.sql`
5. Check bot logs for API call failures

## Success Criteria

✅ Build passes without errors  
❌ Database migration executed  
❌ Guild dropdown shows multiple guilds  
❌ Switching guilds loads different configurations  
❌ Save button persists guild-specific settings  
❌ Bot reads guild-specific configuration  
