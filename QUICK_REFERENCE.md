# 🎯 Quick Reference: Guild Data Reset

## ✅ What's Done

**Both guilds reset successfully!**
- House Melange: 98 resources (all 0/1000)
- Whitelist Second Guild: 98 resources (all 0/1000)
- Leaderboards: Empty
- History: Clean slate

## 🚀 Quick Commands

### Verify Current Setup
```bash
cd c:\Users\colbi\OneDrive\Desktop\ResourceTracker-main
node scripts/verify-setup.js
```

### Reset Everything Again (if needed)
```bash
cd c:\Users\colbi\OneDrive\Desktop\ResourceTracker-main
node scripts/setup-guilds-and-resources.js
```

### Reset Just Resources (keep guilds)
```bash
cd c:\Users\colbi\OneDrive\Desktop\ResourceTracker-main
node scripts/reset-guild-data.js
```

## 🤖 Bot Integration

**To auto-create resources for new guilds**, add this to your bot's guild creation code:

```python
import aiohttp

async def initialize_guild_resources(guild_id: str, guild_title: str):
    """Call website API to create 98 standard resources"""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            'https://your-website.com/api/guilds/initialize',
            json={
                'guildId': guild_id,
                'guildTitle': guild_title
            }
        ) as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ Created {result['resourcesCreated']} resources for {guild_title}")
                return True
            else:
                print(f"❌ Failed to initialize resources for {guild_title}")
                return False
```

Then call it after creating a guild in your database:
```python
# After inserting guild into database
await initialize_guild_resources(new_guild_id, new_guild_title)
```

## 📦 Standard Resources

All guilds get these **98 resources** organized into 15 categories:

| Category | Count | Highlights |
|----------|-------|------------|
| Raw Materials | 6 | Wood, Stone, Iron Ore, Copper Ore |
| Refined Materials | 7 | Plasteel, Ceramics, Polymer Sheets |
| Electronics | 7 | Circuit Boards, Quantum Processors |
| Energy | 6 | Spice Melange (3.0x), Fusion Cores |
| Survival | 7 | Water, Stillsuit Filters, Medical |
| Spice Operations | 6 | Harvester Parts, Carryall Components |
| Weapons | 6 | Lasguns, Crysknives, Shields |
| Armor | 6 | Stillsuits, Combat Armor |
| Vehicles | 6 | Ornithopter Parts, Sandcrawler Parts |
| Construction | 7 | Concrete Mix, Atmospheric Processors |
| Advanced Tech | 8 | Suspension Fields, Null Emitters |
| Tools | 7 | Mining Equipment, Recycling Units |
| Chemicals | 6 | Industrial Chemicals, Explosives |
| Intelligence | 6 | Encrypted Data, Decryption Keys |
| Luxury | 7 | Spice Essence (2.8x), Rare Metals |

**All start at**: 0/1,000 (Critical status)

## 🎨 Adding Images Later

When you have your resource images:

1. Upload images to a CDN
2. Create an update script:
```javascript
const updates = [
  { name: 'Wood', imageUrl: 'https://cdn.example.com/wood.png' },
  { name: 'Stone', imageUrl: 'https://cdn.example.com/stone.png' },
  // ... etc
]

for (const update of updates) {
  await client.execute({
    sql: 'UPDATE resources SET image_url = ? WHERE name = ?',
    args: [update.imageUrl, update.name]
  })
}
```

## ⚠️ Important Notes

- **Database**: Currently using `file:local.db` (local)
- **Production**: Update `.env.local` to use Turso URL for production
- **Backups**: Run `cp local.db local.db.backup` before major changes
- **Guild IDs**: `house-melange` and `whitelist-second-guild` are hardcoded

## 📁 Files Created

All scripts are in: `c:\Users\colbi\OneDrive\Desktop\ResourceTracker-main\scripts\`

- `setup-guilds-and-resources.js` - Complete reset & setup
- `reset-guild-data.js` - Reset existing guilds
- `verify-setup.js` - Check current state
- `add-guild-id-column.js` - Database migration
- `check-schema.js` - Inspect table structure

API endpoint: `app/api/guilds/initialize/route.ts`

## 🔍 Troubleshooting

**Problem**: Resources not showing on website
- Check guild dropdown - select the correct guild
- Refresh page
- Check browser console for errors

**Problem**: Bot can't create orders
- Verify resources exist: run verify-setup.js
- Check guild_id matches between bot and website
- Check Discord server ID is correct (1261674004780027904)

**Problem**: Need to start over
- Run: `node scripts/setup-guilds-and-resources.js`
- This clears everything and recreates from scratch

## 📞 Quick Help

```bash
# See what's in database
node scripts/verify-setup.js

# Start completely fresh
node scripts/setup-guilds-and-resources.js

# Reset resources only
node scripts/reset-guild-data.js

# Check table structure
node scripts/check-schema.js
```
