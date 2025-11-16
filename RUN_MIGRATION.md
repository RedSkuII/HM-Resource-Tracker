# How to Run Database Migration

## ⚠️ CRITICAL: This migration MUST be run before the new dashboard features will work!

The dashboard has been completely refactored to use guild-specific configuration, but the database needs 8 new columns added to the `guilds` table.

## Prerequisites

- Turso database credentials configured in `.env.local`
- Drizzle CLI installed (`npm install` already done)

## Option 1: Automatic Migration (Recommended)

Run this command from the ResourceTracker-main directory:

```bash
npm run db:push
```

This will:
1. Read `drizzle/0013_parched_tempest.sql`
2. Connect to your Turso production database
3. Execute the ALTER TABLE statements
4. Add all 8 new columns with default values

## Option 2: Manual Verification

If you want to see what will be executed first:

```bash
# View the migration file
cat drizzle/0013_parched_tempest.sql
```

You should see these statements:
```sql
ALTER TABLE "guilds" ADD "bot_channel_id" text;
ALTER TABLE "guilds" ADD "order_channel_id" text;
ALTER TABLE "guilds" ADD "admin_role_id" text;
ALTER TABLE "guilds" ADD "auto_update_embeds" integer DEFAULT true NOT NULL;
ALTER TABLE "guilds" ADD "notify_on_website_changes" integer DEFAULT true NOT NULL;
ALTER TABLE "guilds" ADD "order_fulfillment_bonus" integer DEFAULT 50 NOT NULL;
ALTER TABLE "guilds" ADD "website_bonus_percentage" integer DEFAULT 0 NOT NULL;
ALTER TABLE "guilds" ADD "allow_public_orders" integer DEFAULT true NOT NULL;
```

## Option 3: Turso CLI (If you have it installed)

```bash
# Connect to your database
turso db shell hm-resources-tracker

# Then run each ALTER TABLE statement manually
# (Copy/paste from drizzle/0013_parched_tempest.sql)
```

## Verification

After running the migration, verify the columns were added:

```bash
# Option A: Using Drizzle Studio
npm run db:studio
# Then browse to http://localhost:4983 and check the guilds table

# Option B: Using Turso CLI
turso db shell hm-resources-tracker
.schema guilds
.quit
```

You should see the 8 new columns in the guilds table.

## Testing

Once migration is complete:

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Open dashboard:**
   - Navigate to http://localhost:3000/dashboard/bot
   - Select your Discord server
   - Select an in-game guild from dropdown
   - Configure bot channels, admin roles, bonuses
   - Click "Save Configuration"

3. **Test guild switching:**
   - Select a different guild from dropdown
   - Configuration should be empty/different
   - Configure it differently
   - Save
   - Switch back to first guild
   - Should show original configuration

4. **Check database:**
   ```bash
   npm run db:studio
   ```
   - Browse to guilds table
   - Find your guild row
   - Should see values in new columns like:
     - `bot_channel_id`: ["123456789012345678"]
     - `admin_role_id`: ["987654321098765432"]
     - `order_fulfillment_bonus`: 50
     - etc.

## Troubleshooting

### Migration fails with "column already exists"
The migration has already been run. Check the guilds table to verify columns exist.

### Migration fails with "database is locked"
1. Stop development server (`Ctrl+C`)
2. Close Drizzle Studio if open
3. Run migration again

### API returns 500 error after migration
1. Check that all 8 columns were added
2. Restart development server
3. Check browser DevTools Network tab for detailed error
4. Check terminal for server error logs

### Columns exist but Save button doesn't work
1. Check browser DevTools Console for errors
2. Check Network tab - look for POST to `/api/guilds/[guildId]/config`
3. Check response body for error message
4. Verify `selectedInGameGuildId` state is set (should show in dropdown)

## What This Migration Does

Adds configuration storage to each guild:

| Column | Type | Purpose | Default |
|--------|------|---------|---------|
| `bot_channel_id` | TEXT (JSON) | Discord channels for bot notifications | `null` |
| `order_channel_id` | TEXT (JSON) | Discord channels for order requests | `null` |
| `admin_role_id` | TEXT (JSON) | Discord roles that can access bot config | `null` |
| `auto_update_embeds` | INTEGER (boolean) | Auto-refresh Discord embeds | `true` |
| `notify_on_website_changes` | INTEGER (boolean) | Notify Discord when resources change via web | `true` |
| `order_fulfillment_bonus` | INTEGER | Bonus % for filling Discord orders | `50` |
| `website_bonus_percentage` | INTEGER | Bonus % for adding via website | `0` |
| `allow_public_orders` | INTEGER (boolean) | Allow non-members to place orders | `true` |

## Safety

- **Non-destructive:** Only adds columns, doesn't delete/modify existing data
- **Default values:** All columns have sensible defaults
- **Reversible:** Can remove columns if needed (though not recommended)
- **No data loss:** Existing guilds table data remains intact

## After Migration

The dashboard will now support:
- ✅ Guild-specific bot notification channels
- ✅ Guild-specific order request channels
- ✅ Guild-specific admin roles
- ✅ Guild-specific point bonuses
- ✅ Guild-specific settings (auto-update, notifications, public orders)
- ✅ Complete separation of guilds on same Discord server

## Next: Bot Updates

After confirming dashboard works, you'll need to update TRZBot to:
1. Read guild-specific channels from `guilds` table
2. Use guild-specific admin roles for permissions
3. Apply guild-specific bonuses when users interact

See `DASHBOARD_REFACTOR_COMPLETE.md` for more details.
