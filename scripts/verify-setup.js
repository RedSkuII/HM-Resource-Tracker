const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function verify() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  console.log('\n📊 DATABASE VERIFICATION\n')

  // Guilds
  const guilds = await client.execute('SELECT * FROM guilds')
  console.log('🏰 Guilds:')
  guilds.rows.forEach(g => {
    console.log(`  ✓ ${g.title}`)
    console.log(`    - ID: ${g.id}`)
    console.log(`    - Discord Server: ${g.discord_guild_id}`)
  })

  // Resources per guild
  console.log('\n📦 Resources per guild:')
  const resourceCounts = await client.execute('SELECT guild_id, COUNT(*) as count FROM resources GROUP BY guild_id')
  resourceCounts.rows.forEach(r => {
    console.log(`  ✓ ${r.guild_id}: ${r.count} resources`)
  })

  // Categories for House Melange
  console.log('\n📂 Categories (House Melange):')
  const categories = await client.execute(`
    SELECT category, COUNT(*) as count 
    FROM resources 
    WHERE guild_id = 'house-melange' 
    GROUP BY category 
    ORDER BY category
  `)
  categories.rows.forEach(c => {
    console.log(`  - ${c.category}: ${c.count}`)
  })

  // Total
  const total = await client.execute('SELECT COUNT(*) as total FROM resources')
  console.log(`\n✅ Total resources in database: ${total.rows[0].total}`)

  // Leaderboard
  const leaderboard = await client.execute('SELECT COUNT(*) as count FROM leaderboard')
  console.log(`✅ Leaderboard entries: ${leaderboard.rows[0].count}`)

  // History
  const history = await client.execute('SELECT COUNT(*) as count FROM resource_history')
  console.log(`✅ History entries: ${history.rows[0].count}\n`)
}

verify()
