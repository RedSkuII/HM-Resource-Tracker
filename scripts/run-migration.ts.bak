/**
 * Migration Script: Add Guild-Specific Config Columns
 * 
 * This script executes the SQL from drizzle/0013_parched_tempest.sql
 * against the production Turso database.
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

async function runMigration() {
  console.log('🔄 Connecting to Turso database...')
  
  const client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  })

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'drizzle', '0013_parched_tempest.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration SQL:')
    console.log(migrationSQL)
    console.log('')
    
    // Split by statement breakpoint and filter out empty statements
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`🚀 Executing ${statements.length} SQL statements...`)
    console.log('')
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      console.log(`  [${i + 1}/${statements.length}] ${stmt.substring(0, 60)}...`)
      
      try {
        await client.execute(stmt)
        console.log(`  ✅ Success`)
      } catch (error: any) {
        // Check if error is "duplicate column name" - means already migrated
        if (error.message?.includes('duplicate column name')) {
          console.log(`  ⚠️  Column already exists (skipping)`)
        } else {
          console.error(`  ❌ Error: ${error.message}`)
          throw error
        }
      }
    }
    
    console.log('')
    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Refresh the dashboard in your browser')
    console.log('2. Select a Discord server from the dropdown')
    console.log('3. Select an in-game guild from the dropdown')
    console.log('4. Configure bot channels, admin roles, and bonuses')
    console.log('5. Click "Save Configuration"')
    console.log('')
    console.log('The settings should now save successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

runMigration()
