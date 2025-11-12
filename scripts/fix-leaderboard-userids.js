/**
 * Migration script to fix leaderboard userId fields
 * Converts username strings to Discord IDs by matching with users table
 */

import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env.production
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.production') })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

async function fixLeaderboardUserIds() {
  try {
    console.log('Starting leaderboard userId migration...\n')

    // Get all unique userIds from leaderboard
    const leaderboardUsers = await client.execute(
      'SELECT DISTINCT user_id FROM leaderboard'
    )
    
    console.log(`Found ${leaderboardUsers.rows.length} unique userIds in leaderboard\n`)

    // Get all users from users table
    const usersResult = await client.execute(
      'SELECT discord_id, username, custom_nickname FROM users'
    )
    
    console.log(`Found ${usersResult.rows.length} users in users table\n`)

    // Create mapping of usernames to Discord IDs
    const usernameToDiscordId = {}
    for (const user of usersResult.rows) {
      const discordId = user.discord_id
      const username = user.username
      const nickname = user.custom_nickname
      
      // Map both username and nickname to Discord ID
      if (username) usernameToDiscordId[username] = discordId
      if (nickname) usernameToDiscordId[nickname] = discordId
      
      // Also map common variations
      if (username) usernameToDiscordId[`${username} (Discord)`] = discordId
      if (nickname) usernameToDiscordId[`${nickname} (Discord)`] = discordId
    }

    console.log('Username to Discord ID mapping:')
    console.log(usernameToDiscordId)
    console.log('')

    // Check each leaderboard userId
    let updated = 0
    let alreadyCorrect = 0
    let notFound = 0

    for (const row of leaderboardUsers.rows) {
      const currentUserId = row.user_id
      
      // Check if it's already a Discord ID (numeric string of 17-19 digits)
      if (/^\d{17,19}$/.test(currentUserId)) {
        console.log(`✓ ${currentUserId} is already a Discord ID`)
        alreadyCorrect++
        continue
      }

      // Try to find matching Discord ID
      const discordId = usernameToDiscordId[currentUserId]
      
      if (discordId) {
        console.log(`Updating "${currentUserId}" → "${discordId}"`)
        
        // Update all leaderboard entries with this userId
        const result = await client.execute({
          sql: 'UPDATE leaderboard SET user_id = ? WHERE user_id = ?',
          args: [discordId, currentUserId]
        })
        
        console.log(`  Updated ${result.rowsAffected} rows\n`)
        updated += result.rowsAffected
      } else {
        console.log(`✗ No Discord ID found for "${currentUserId}"\n`)
        notFound++
      }
    }

    console.log('\n=== Migration Summary ===')
    console.log(`Already correct: ${alreadyCorrect}`)
    console.log(`Updated: ${updated} rows`)
    console.log(`Not found: ${notFound}`)
    
    // Verify results
    console.log('\n=== Verification ===')
    const remaining = await client.execute(`
      SELECT DISTINCT user_id 
      FROM leaderboard 
      WHERE user_id NOT REGEXP '^[0-9]{17,19}$'
    `)
    
    if (remaining.rows.length === 0) {
      console.log('✓ All leaderboard entries now use Discord IDs!')
    } else {
      console.log(`⚠ ${remaining.rows.length} entries still have non-Discord-ID userIds:`)
      remaining.rows.forEach(row => console.log(`  - ${row.user_id}`))
    }

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

fixLeaderboardUserIds()
  .then(() => {
    console.log('\nMigration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nMigration failed:', error)
    process.exit(1)
  })
