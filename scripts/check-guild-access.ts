/**
 * Check guild access configuration for server 1440025222693650606
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkGuildAccess() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  try {
    const serverId = '1440025222693650606'
    
    console.log(`\nChecking guild access roles for server: ${serverId}\n`)
    
    const result = await client.execute({
      sql: `SELECT id, title, guild_access_roles, guild_officer_roles, default_role_id, leader_id FROM guilds WHERE discord_guild_id = ?`,
      args: [serverId]
    })
    
    result.rows.forEach((row: any) => {
      console.log(`Guild: ${row.title}`)
      console.log(`  ID: ${row.id}`)
      console.log(`  Leader ID: ${row.leader_id || 'None'}`)
      console.log(`  Access Roles: ${row.guild_access_roles || 'None'}`)
      console.log(`  Officer Roles: ${row.guild_officer_roles || 'None'}`)
      console.log(`  Default Role: ${row.default_role_id || 'None'}`)
      console.log('')
    })
    
    console.log('DIAGNOSIS:')
    console.log('If all roles show "None", then ONLY bot admins can see these guilds in autocomplete.')
    console.log('\nTo fix:')
    console.log('1. Set guild_access_roles for each guild, OR')
    console.log('2. Make sure the user testing has bot admin permissions')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    client.close()
  }
}

checkGuildAccess()
