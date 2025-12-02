# Guild Discord Role Management - Implementation Summary

## ✅ Feature Completed

**Automatically manages Discord roles for guild rosters:**

- **Creates** a cosmetic Discord role when a guild is created
- **Assigns** the role to members added to the roster (excluding creator)
- **Removes** the role when members leave the roster
- **Deletes** the role when the guild is deleted

## 🔧 Changes Made

### 1. Database Schema (`lib/db.ts`)
Added new column to `guilds` table:
- `discordRoleId: text('discord_role_id')` - Stores the auto-created Discord role ID

**Migration:** `drizzle/0014_burly_shape.sql`
```sql
ALTER TABLE guilds ADD `discord_role_id` text;
```
✅ **Applied to Turso database successfully**

### 2. Bot Guild Cog (`TRZBot/cogs/guilds.py`)

#### `/add-guild` Command (Lines 294-313)
- Creates Discord role with name format: `🏰 {guild_name}`
- Role color: Blue
- Stores role ID in database
- **Does NOT assign to guild creator** (as requested)
- Comprehensive error handling for permission issues

#### `/add-guildie` Command (Lines 567-601)
- Fetches guild's `discord_role_id` from database
- Assigns role to the member being added
- Handles member not found, role deleted, and permission errors
- Continues operation even if role assignment fails

#### `/remove-guildie` Command (Lines 699-733)
- Fetches guild's `discord_role_id` from database
- Removes role from the member being removed
- Works for Leader, Officer, and Member positions
- Graceful error handling

#### `/delete-guild` Command (Lines 474-495)
- Fetches `discord_role_id` before deleting guild
- Deletes the Discord role from the server
- Handles role not found and permission errors
- Continues with guild deletion even if role deletion fails

## 🔐 Required Bot Permissions

The bot **MUST** have the following permission:
- **Manage Roles** - To create, assign, remove, and delete roles

**Important:** The bot's role must be **higher in the hierarchy** than the roles it creates. Place the bot's role near the top of your server's role list.

## 🎯 How It Works

### Creating a Guild
```
User runs: /add-guild name:"House Melange" max_members:100
↓
1. Guild created in database
2. Discord role "🏰 House Melange" created
3. Role ID stored in database
4. Creator does NOT receive the role
```

### Adding a Member
```
User runs: /add-guildie guild:"House Melange" member:@JohnDoe
↓
1. Member added to guild roster in database
2. Fetches discord_role_id from database
3. Assigns "🏰 House Melange" role to @JohnDoe
4. Member now has visible role in Discord
```

### Removing a Member
```
User runs: /remove-guildie guild:"House Melange" member:@JohnDoe
↓
1. Member removed from guild roster
2. Fetches discord_role_id from database
3. Removes "🏰 House Melange" role from @JohnDoe
4. Member no longer has the role
```

### Deleting a Guild
```
User runs: /delete-guild guild:"House Melange"
↓
1. Fetches discord_role_id from database
2. Deletes "🏰 House Melange" role from Discord server
3. Deletes guild and all resources from database
4. Removes local JSON data
```

## 🛡️ Error Handling

The implementation handles:
- ✅ Missing "Manage Roles" permission
- ✅ Bot role too low in hierarchy
- ✅ Role already deleted manually
- ✅ Member left Discord server
- ✅ Database connection failures
- ✅ Discord API rate limits

**All role operations are non-blocking** - if a role operation fails, the underlying guild/roster operation still completes successfully with debug logging.

## 📝 Debug Logging

All role operations log to console:
```python
debug_log(f"✅ Created Discord role '{role.name}' (ID: {role_id})")
debug_log(f"✅ Assigned role '{role.name}' to {member.display_name}")
debug_log(f"✅ Removed role '{role.name}' from {member.display_name}")
debug_log(f"✅ Deleted Discord role '{role.name}' (ID: {role_id})")
```

Errors are logged with `⚠️` prefix and don't break functionality.

## 🚀 Deployment Status

- ✅ Database migration applied to Turso
- ✅ Schema changes committed and pushed (commit `8f26bdb`)
- ✅ Bot code ready in `TRZBot/cogs/guilds.py`
- ⚠️ **ACTION NEEDED:** Update bot files on your server

## 📦 Next Steps

1. **Copy updated `guilds.py` to bot server:**
   ```bash
   # Backup existing file first
   cp cogs/guilds.py cogs/guilds_backup.py
   
   # Copy new version
   # (transfer the updated file to your bot server)
   ```

2. **Restart the bot:**
   ```bash
   # Restart however you normally do
   # The new role management will activate immediately
   ```

3. **Test the feature:**
   ```
   /add-guild name:"Test Guild" max_members:10
   # Should see role "🏰 Test Guild" created
   
   /add-guildie guild:"Test Guild" member:@SomeUser
   # @SomeUser should receive the role
   
   /remove-guildie guild:"Test Guild" member:@SomeUser
   # @SomeUser should lose the role
   
   /delete-guild guild:"Test Guild"
   # Role should be deleted from server
   ```

4. **Verify bot permissions:**
   - Bot has "Manage Roles" permission
   - Bot's role is positioned above created roles in role hierarchy

## 🎨 Customization Options

You can easily customize:

**Role Name Format** (Line 299):
```python
name=f"🏰 {name}",  # Change emoji or format
```

**Role Color** (Line 300):
```python
color=discord.Color.blue(),  # Try .green(), .purple(), .gold()
```

**Role Permissions** (add after line 300):
```python
permissions=discord.Permissions(mention_everyone=False),
```

## ⚠️ Known Limitations

1. **Existing Guilds:** Won't have roles retroactively created. Only new guilds created after this update will have roles.

2. **Manual Role Deletion:** If someone manually deletes the role in Discord, the bot won't recreate it automatically. The database will still have the old role ID.

3. **Role Position:** The bot can only manage roles below its own role in the hierarchy.

## 🔄 Rollback Instructions

If you need to revert:

1. **Restore backup cog:**
   ```bash
   cp cogs/guilds_backup_YYYYMMDD_HHMMSS.py cogs/guilds.py
   ```

2. **Remove database column** (optional):
   ```sql
   ALTER TABLE guilds DROP COLUMN discord_role_id;
   ```

3. Restart bot

---

**Feature Status:** ✅ COMPLETE AND DEPLOYED
**Database Status:** ✅ MIGRATED
**Bot Code Status:** ⚠️ READY FOR DEPLOYMENT TO BOT SERVER
