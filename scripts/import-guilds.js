require('dotenv').config({ path: '.env.production' })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function importGuilds() {
  try {
    console.log('🔄 Importing in-game guilds from bot files...\n')
    
    const discordGuildId = process.env.DISCORD_GUILD_ID || '1261674004780027904'
    const guildsFile = path.join(__dirname, '..', '..', 'TRZBot', `guilds_${discordGuildId}.json`)
    
    console.log(`Looking for: ${guildsFile}`)
    
    if (!fs.existsSync(guildsFile)) {
      console.log('❌ Guild file not found!')
      return
    }
    
    const guildsData = JSON.parse(fs.readFileSync(guildsFile, 'utf-8'))
    console.log(`✅ Found ${Object.keys(guildsData).length} guilds\n`)
    
    const now = Math.floor(Date.now() / 1000)
    
    for (const [key, guildInfo] of Object.entries(guildsData)) {
      const guildId = createSlug(guildInfo.title)
      
      // Check if exists
      const existing = await client.execute({
        sql: `SELECT id FROM guilds WHERE id = ?`,
        args: [guildId]
      })
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Guild already exists: ${guildInfo.title} (${guildId})`)
        continue
      }
      
      // Insert
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
      
      console.log(`✅ Created guild: ${guildInfo.title}`)
      console.log(`   ID: ${guildId}`)
      console.log(`   Members: ${guildInfo.members?.length || 0}`)
      console.log(`   Leader: ${guildInfo.leader || 'none'}`)
      console.log()
    }
    
    // List all guilds
    const allGuilds = await client.execute(`SELECT * FROM guilds ORDER BY title`)
    console.log('\n📋 All in-game guilds in database:')
    for (const guild of allGuilds.rows) {
      console.log(`  - ${guild.title} (${guild.id})`)
    }
    
    console.log('\n🎉 Import complete!')
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    throw error
  }
}

importGuilds().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
