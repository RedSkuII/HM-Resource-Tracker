# Guild-Specific Bot Configuration Refactor

## Overview
Changed bot configuration from Discord-server-level to in-game-guild-level. Each in-game guild now has completely independent settings.

## Database Changes

### Modified Table: `guilds`
Added columns (migration `0013_parched_tempest.sql`):
- `bot_channel_id` TEXT - JSON array of Discord channel IDs for this guild's notifications
- `order_channel_id` TEXT - JSON array of Discord channel IDs for this guild's orders
- `admin_role_id` TEXT - JSON array of Discord role IDs that can configure this guild
- `auto_update_embeds` INTEGER (boolean) DEFAULT true
- `notify_on_website_changes` INTEGER (boolean) DEFAULT true
- `order_fulfillment_bonus` INTEGER DEFAULT 50
- `website_bonus_percentage` INTEGER DEFAULT 0
- `allow_public_orders` INTEGER (boolean) DEFAULT true

### Migration Status
- ✅ Schema updated in `lib/db.ts`
- ✅ Migration file generated: `drizzle/0013_parched_tempest.sql`
- ⚠️ **TODO:** Run migration against Turso production database

## API Changes

### New Endpoint: `/api/guilds/[guildId]/config`
- **GET** - Fetch guild-specific bot configuration
- **PUT** - Update guild-specific bot configuration
- File: `app/api/guilds/[guildId]/config/route.ts`
- ✅ Created

### Deprecated Endpoint: `/api/bot/config/[guildId]`
- This endpoint fetched config per Discord server
- Will be replaced by guild-specific endpoint

## Frontend Changes Needed

### Dashboard Page (`app/dashboard/bot/page.tsx`)

#### Current Flow:
1. Select Discord Server → Load bot config for that server
2. Select In-Game Guild (dropdown) → Only affects Guild Officer/Access Roles

#### New Flow:
1. Select Discord Server → Show list of in-game guilds
2. Select In-Game Guild → Load ALL configuration for that specific guild
3. Each guild has independent: bot channels, order channels, admin roles, bonuses, checkboxes

#### Required Changes:
1. **Remove `config` state** - configuration is now part of `InGameGuild` interface
2. **Add `selectedInGameGuildId` state** - tracks which guild user is configuring
3. **Update `fetchGuildConfig` function** - fetch from `/api/guilds/[guildId]/config`
4. **Update `handleSaveConfig` function** - save to `/api/guilds/[guildId]/config`
5. **Update all form bindings** - bind to `inGameGuilds.find(g => g.id === selectedInGameGuildId)`
6. **Update useEffect** - fetch guild config when `selectedInGameGuildId` changes

## Migration Steps

1. **Run database migration** (CRITICAL - run against Turso):
   ```sql
   -- Copy migration SQL from drizzle/0013_parched_tempest.sql
   -- Execute against Turso database
   ```

2. **Update Dashboard Frontend** (IN PROGRESS):
   - Refactor state management
   - Update API calls
   - Update form bindings

3. **Test Flow**:
   - Select Discord server
   - Select in-game guild
   - Verify all settings load correctly
   - Change settings and save
   - Switch to different guild
   - Verify settings are independent

4. **Update Bot** (TRZBot):
   - Bot needs to fetch guild-specific channels
   - Bot commands need to check guild-specific admin roles
   - Bot notifications need to use guild-specific channels

## Status

- ✅ Database schema updated
- ✅ Migration generated
- ✅ New API endpoint created
- ⚠️ Dashboard refactor IN PROGRESS
- ❌ Migration not yet run on production
- ❌ Bot not yet updated

## Notes

- Each in-game guild can now have completely different Discord channels, roles, and settings
- Multiple guilds can exist on the same Discord server with zero overlap
- This allows communities to track multiple games or guild splits independently
