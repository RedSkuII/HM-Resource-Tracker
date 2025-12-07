/**
 * Check guilds in database for a specific Discord server
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function checkGuildsForServer() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  try {
    const serverId = '1440025222693650606' // The Red Zone
    
    console.log(`\nChecking guilds for Discord server: ${serverId}\n`)
    
    const result = await client.execute({
      sql: `SELECT id, title, discord_guild_id, created_at FROM guilds WHERE discord_guild_id = ?`,
      args: [serverId]
    })
    
    if (result.rows.length === 0) {
      console.log('❌ No guilds found in database for this server!')
      console.log('\nThis is why autocomplete is empty.')
      console.log('The JSON file has guilds, but they were never synced to the database.')
    } else {
      console.log(`✅ Found ${result.rows.length} guild(s):\n`)
      result.rows.forEach((row: any) => {
        console.log(`  - ${row.title} (ID: ${row.id})`)
        console.log(`    Created: ${new Date(row.created_at * 1000).toLocaleString()}`)
      })
    }
    
    console.log('\n--- Comparison with JSON file ---')
    console.log('JSON file has: The High Handed Friend, foreheadvcr, tester1')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    client.close()
  }
}

checkGuildsForServer()
