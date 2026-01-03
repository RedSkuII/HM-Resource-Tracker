/**
 * Fix leaderboard entries that have guild_id = 'default-guild'
 * 
 * This script:
 * 1. Finds all leaderboard entries with guild_id = 'default-guild'
 * 2. Looks up the correct guild_id from the associated resource
 * 3. Updates the leaderboard entry with the correct guild_id
 * 
 * Run with: node scripts/fix-leaderboard-guild-ids.js
 */

const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function fixLeaderboardGuildIds() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  try {
    console.log('🔍 Finding leaderboard entries with guild_id = "default-guild"...\n')

    // Find all entries with default-guild
    const badEntries = await client.execute({
      sql: `SELECT l.id, l.resource_id, l.user_id, l.resource_name, r.guild_id as correct_guild_id
            FROM leaderboard l
            LEFT JOIN resources r ON l.resource_id = r.id
            WHERE l.guild_id = 'default-guild'`,
      args: []
    })

    console.log(`Found ${badEntries.rows.length} entries to fix\n`)

    if (badEntries.rows.length === 0) {
      console.log('✅ No entries need fixing!')
      return
    }

    // Group by correct guild_id for summary
    const byGuild = {}
    for (const row of badEntries.rows) {
      const guildId = row.correct_guild_id || 'NULL (resource not found)'
      byGuild[guildId] = (byGuild[guildId] || 0) + 1
    }
    
    console.log('Distribution of correct guild IDs:')
    for (const [guildId, count] of Object.entries(byGuild)) {
      console.log(`  ${guildId}: ${count} entries`)
    }
    console.log('')

    // Update entries where we can find the correct guild_id
    let updated = 0
    let skipped = 0
    
    for (const row of badEntries.rows) {
      if (row.correct_guild_id) {
        await client.execute({
          sql: `UPDATE leaderboard SET guild_id = ? WHERE id = ?`,
          args: [row.correct_guild_id, row.id]
        })
        updated++
      } else {
        // Resource doesn't exist - skip or set to NULL
        console.log(`⚠️  Skipping entry ${row.id} - resource ${row.resource_id} not found`)
        skipped++
      }
    }

    console.log(`\n✅ Updated ${updated} entries`)
    if (skipped > 0) {
      console.log(`⚠️  Skipped ${skipped} entries (orphaned resources)`)
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...')
    const remaining = await client.execute({
      sql: `SELECT COUNT(*) as count FROM leaderboard WHERE guild_id = 'default-guild'`,
      args: []
    })
    console.log(`Remaining entries with 'default-guild': ${remaining.rows[0].count}`)

    // Show current distribution
    const distribution = await client.execute({
      sql: `SELECT guild_id, COUNT(*) as count FROM leaderboard GROUP BY guild_id ORDER BY count DESC`,
      args: []
    })
    console.log('\nCurrent guild_id distribution in leaderboard:')
    for (const row of distribution.rows) {
      console.log(`  ${row.guild_id || 'NULL'}: ${row.count} entries`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    client.close()
  }
}

fixLeaderboardGuildIds()
