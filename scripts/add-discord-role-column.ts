/**
 * Migration script to add discord_role_id column to guilds table
 * Run this once to update the Turso database
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function addDiscordRoleColumn() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  try {
    console.log('Adding discord_role_id column to guilds table...')
    
    await client.execute(`
      ALTER TABLE guilds ADD COLUMN discord_role_id TEXT
    `)
    
    console.log('✅ Successfully added discord_role_id column!')
    console.log('\nYou can now:')
    console.log('1. Create guilds with Discord roles')
    console.log('2. Roles will be auto-assigned to roster members')
    console.log('3. Roles will be removed when members leave')
    console.log('4. Roles will be deleted when guilds are deleted')
    
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️  Column already exists - migration already applied')
    } else {
      console.error('❌ Migration failed:', error)
      throw error
    }
  } finally {
    client.close()
  }
}

addDiscordRoleColumn()
