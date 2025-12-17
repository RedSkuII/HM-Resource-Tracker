/**
 * Migration script to add discord_order_channel_id column
 * Run with: npx tsx scripts/add-order-channel-column.ts
 */

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function runMigration() {
  const databaseUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!databaseUrl || !authToken) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local')
    process.exit(1)
  }

  console.log('🔗 Connecting to Turso database...')
  
  const client = createClient({
    url: databaseUrl,
    authToken: authToken,
  })

  const db = drizzle(client)

  try {
    console.log('📝 Adding discord_order_channel_id column...')
    await client.execute('ALTER TABLE guilds ADD COLUMN discord_order_channel_id TEXT;')
    console.log('✅ Added discord_order_channel_id column')
    
    console.log('🎉 Migration completed successfully!')
    
    // Verify column was added
    console.log('\n📊 Verifying schema...')
    const result = await client.execute('PRAGMA table_info(guilds);')
    console.log('\nGuilds table columns:')
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.name} (${row.type})`)
    })
    
  } catch (error: any) {
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('ℹ️  Column already exists, skipping...')
    } else {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  } finally {
    client.close()
  }
}

runMigration()
