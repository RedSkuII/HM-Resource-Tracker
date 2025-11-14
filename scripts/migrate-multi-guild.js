/**
 * Migration script for adding multi-guild support
 * This will:
 * 1. Create guilds table
 * 2. Add guild_id to resources, resource_history, and leaderboard
 * 3. Import existing in-game guilds from bot JSON files
 * 4. Assign existing resources to a default guild
 */

const { createClient } = require('@libsql/client')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.production' })

// Helper function to create guild slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function migrateToMultiGuild() {
  console.log('🔄 Starting multi-guild migration...')
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })

  try {
    // Step 1: Check if migration needed
    console.log('\n📊 Checking current schema...')
    const resourcesInfo = await client.execute(`PRAGMA table_info(resources)`)
    const hasGuildId = resourcesInfo.rows.some(r => r.name === 'guild_id')
    
    if (hasGuildId) {
      console.log('✅ Migration already applied!')
      return
    }

    // Step 2: Create guilds table first
    console.log('\n⚠️  Creating guilds table...')
    const guildsTableExists = existingColumns.guilds
    if (!guildsTableExists) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS guilds (
          id TEXT PRIMARY KEY NOT NULL,
          discord_guild_id TEXT NOT NULL,
          title TEXT NOT NULL,
          max_members INTEGER DEFAULT 32 NOT NULL,
          leader_id TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)
      console.log('✅ Guilds table created!')
    } else {
      console.log('⏭️  Guilds table already exists')
    }

    // Step 3: Import guilds from bot JSON file FIRST
    console.log('\n📥 Importing guilds from bot files...')
    const discordGuildId = process.env.DISCORD_GUILD_ID || '1261674004780027904'
    const guildsFile = path.join(__dirname, '..', '..', 'TRZBot', `guilds_${discordGuildId}.json`)
    
    let guildsData = {}
    let defaultGuildId = 'default-guild'
    
    console.log(`Looking for guild file at: ${guildsFile}`)
    if (fs.existsSync(guildsFile)) {
      console.log(`✅ Found guild file!`)
      guildsData = JSON.parse(fs.readFileSync(guildsFile, 'utf-8'))
      console.log(`📦 Found ${Object.keys(guildsData).length} in-game guilds`)
      console.log('Guild keys:', Object.keys(guildsData))
    } else {
      console.log('⚠️  No guild file found, creating default guild')
      guildsData = {
        'default': {
          title: 'Default Guild',
          max_members: 32,
          leader: null
        }
      }
    }

    // Insert guilds into database
    const now = Math.floor(Date.now() / 1000)
    const insertedGuilds = []
    
    for (const [key, guildInfo] of Object.entries(guildsData)) {
      const guildId = createSlug(guildInfo.title)
      
      // Check if guild already exists
      const existing = await client.execute({
        sql: `SELECT id FROM guilds WHERE id = ?`,
        args: [guildId]
      })
      
      if (existing.rows.length === 0) {
        await client.execute({
          sql: `INSERT INTO guilds (id, discord_guild_id, title, max_members, leader_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            guildId,
            discordGuildId,
            guildInfo.title,
            guildInfo.max_members || 32,
            guildInfo.leader ? String(guildInfo.leader) : null,
            now,
            now
          ]
        })
        console.log(`  ✓ Created guild: ${guildInfo.title} (${guildId})`)
      } else {
        console.log(`  ⏭️  Guild already exists: ${guildInfo.title} (${guildId})`)
      }
      
      insertedGuilds.push(guildId)
    }

    // Set default guild as the first one
    defaultGuildId = insertedGuilds[0] || 'default-guild'
    console.log(`\n📌 Default guild set to: ${defaultGuildId}`)

    // Step 4: Add guild_id columns with default value
    console.log('\n⚠️  Adding guild_id columns to existing tables...')
    
    // For resources table
    try {
      await client.execute(`ALTER TABLE resources ADD COLUMN guild_id TEXT DEFAULT '${defaultGuildId}'`)
      console.log('✅ Added guild_id to resources')
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) {
        console.log('⏭️  guild_id already exists in resources')
      } else {
        throw e
      }
    }

    // For resource_history table
    try {
      await client.execute(`ALTER TABLE resource_history ADD COLUMN guild_id TEXT DEFAULT '${defaultGuildId}'`)
      console.log('✅ Added guild_id to resource_history')
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) {
        console.log('⏭️  guild_id already exists in resource_history')
      } else {
        throw e
      }
    }

    // For leaderboard table
    try {
      await client.execute(`ALTER TABLE leaderboard ADD COLUMN guild_id TEXT DEFAULT '${defaultGuildId}'`)
      console.log('✅ Added guild_id to leaderboard')
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) {
        console.log('⏭️  guild_id already exists in leaderboard')
      } else {
        throw e
      }
    }

    // Step 5: Update any NULL guild_id values to default
    console.log('\n📦 Ensuring all records have guild_id...')
    await client.execute({
      sql: `UPDATE resources SET guild_id = ? WHERE guild_id IS NULL`,
      args: [defaultGuildId]
    })
    await client.execute({
      sql: `UPDATE resource_history SET guild_id = ? WHERE guild_id IS NULL`,
      args: [defaultGuildId]
    })
    await client.execute({
      sql: `UPDATE leaderboard SET guild_id = ? WHERE guild_id IS NULL`,
      args: [defaultGuildId]
    })

    // Step 7: Verify migration
    console.log('\n✅ Migration complete! Verifying...')
    const guilds = await client.execute(`SELECT id, title FROM guilds ORDER BY title`)
    console.log('\n📋 In-game Guilds:')
    for (const guild of guilds.rows) {
      const resourceCount = await client.execute({
        sql: `SELECT COUNT(*) as count FROM resources WHERE guild_id = ?`,
        args: [guild.id]
      })
      console.log(`  - ${guild.title} (${guild.id}): ${resourceCount.rows[0].count} resources`)
    }

    console.log('\n🎉 Multi-guild migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('Error details:', error instanceof Error ? error.stack : error)
    throw error
  } finally {
    client.close()
  }
}

migrateToMultiGuild()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed to migrate:', error)
    process.exit(1)
  })
