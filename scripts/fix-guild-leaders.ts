/**
 * Fix guild leader_id for server 1440025222693650606
 * Uses data from the JSON file to update the database
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

async function fixGuildLeaders() {
  // Read the JSON file
  const jsonPath = 'c:\\Users\\colbi\\OneDrive\\Desktop\\new\\guilds_1440025222693650606.json'
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  try {
    console.log('\nUpdating guild leaders from JSON file...\n')
    
    for (const [guildName, guildInfo] of Object.entries(jsonData)) {
      const info = guildInfo as any
      const leader = info.leader
      
      if (leader) {
        // Update the database
        const result = await client.execute({
          sql: `UPDATE guilds SET leader_id = ? WHERE title = ? AND discord_guild_id = ?`,
          args: [String(leader), info.title, '1440025222693650606']
        })
        
        console.log(`✅ Updated "${info.title}" - Leader: ${leader}`)
      } else {
        console.log(`⚠️  Skipped "${info.title}" - No leader in JSON`)
      }
    }
    
    console.log('\n--- Verification ---')
    const check = await client.execute({
      sql: `SELECT title, leader_id FROM guilds WHERE discord_guild_id = ?`,
      args: ['1440025222693650606']
    })
    
    check.rows.forEach((row: any) => {
      console.log(`${row.title}: Leader ID = ${row.leader_id || 'None'}`)
    })
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    client.close()
  }
}

fixGuildLeaders()
