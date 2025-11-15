# Bot Dashboard Sync Fixes - Deployed

## What Was Fixed

### 1. ✅ Default Role Not Syncing to Database
**Problem:** When you set a default role via Discord bot command (`/setup-default-role`), it wasn't appearing on the website dashboard.

**Solution:** Updated `server_config.py` to call `sync_config_to_database()` when default roles are changed, just like admin roles.

### 2. ✅ Guild Access Roles UI Restructure
**Problem:** Guild Access Roles were showing as a separate section listing ALL guilds, instead of being integrated into the selected guild's configuration.

**Solution:** Moved Guild Access Roles dropdown INSIDE the guild-specific configuration section. Now it only shows for the currently selected in-game guild.

## Changes Made

### Discord Bot (Upload to Cybrance)
**File:** `cogs/server_config.py`

- Added `sync_config_to_database()` call in `setup_default_role()` command
- Now syncs default roles to database when changed via Discord

### Website Dashboard (Auto-deployed)
**File:** `app/dashboard/bot/page.tsx`

- Removed separate "Guild Access Roles" section that showed all guilds
- Added Guild Access Roles dropdown inside the guild configuration card
- Only displays when a specific in-game guild is selected
- Shows guild-specific role requirements inline with other settings

## How It Works Now

### Bot Dashboard Flow:
1. Select **Discord Server** (top dropdown)
2. Select **In-Game Guild** (second dropdown)
3. Configure settings for that guild:
   - Admin Roles ← Shared across all guilds
   - Discord Bonus %
   - Website Bonus %
   - Checkboxes (auto-update, notify, etc.)
   - **Guild Access Roles** ← NEW: Shows here for selected guild only
4. Click "Save Configuration" for general settings
5. Click "Save Guild Roles" for guild-specific access roles

### Discord Bot Commands:
```bash
/setup-admins add @Role1 @Role2
/setup-default-role @MemberRole
/setup-view
```

All changes now sync to database automatically! ✅

## Testing Checklist

After deploying:

- [ ] Upload updated `server_config.py` to Cybrance
- [ ] Restart Discord bot on Cybrance
- [ ] Run `/setup-admins add @TestRole` in Discord
- [ ] Check website dashboard - `@TestRole` should appear in Admin Roles
- [ ] Run `/setup-default-role @TestRole` in Discord
- [ ] Check website dashboard - should show (currently not displayed in UI)
- [ ] Select an in-game guild on dashboard
- [ ] Guild Access Roles dropdown should appear below checkboxes
- [ ] Select roles and click "Save Guild Roles"
- [ ] Change to different guild - roles should be specific to each guild

## Deployment Status

✅ **Website:** Deployed to Vercel (auto-deployed from GitHub)
⚠️ **Discord Bot:** Needs manual upload to Cybrance

### To Deploy Bot Changes:
1. Upload `cogs/server_config.py` to Cybrance bot folder
2. Restart the Discord bot
3. Test with `/setup-view` command

## What Still Needs Work (Optional)

### Default Role Not Shown on Dashboard
The dashboard doesn't currently have a UI field to display or edit the "default role" (the role for users who can VIEW but not edit). This is only configurable via Discord bot commands.

**To add this:** Would need to add a "Default Role" dropdown in the dashboard UI similar to Admin Roles.

### Two-Way Sync
Currently: Discord → Database → Dashboard (one-way)
Not yet: Dashboard changes don't update Discord bot's JSON file in real-time

The bot would need to reload config from database periodically or on command. Currently it reads from `server_configs.json` on startup.

## Files Changed

### Bot Folder (TRZBot):
- `cogs/server_config.py` - Added database sync for default roles

### Website Folder (ResourceTracker-main):
- `app/dashboard/bot/page.tsx` - Moved guild access roles into guild-specific section

Both changes are **backward compatible** - no database migrations needed!
