/**
 * Apply migrations to production Turso database
 * Run with: node scripts/migrate-production.js
 */

const { createClient } = require('@libsql/client')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.production' })

async function applyMigrations() {
  console.log('🔄 Connecting to production database...')
  console.log('URL:', process.env.TURSO_DATABASE_URL)
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })

  try {
    // Check current tables
    console.log('\n📊 Checking existing tables...')
    const tables = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `)
    console.log('Existing tables:', tables.rows.map(r => r.name).join(', '))

    // Check if bot_configurations exists
    const hasBotConfig = tables.rows.some(r => r.name === 'bot_configurations')
    const hasBotLogs = tables.rows.some(r => r.name === 'bot_activity_logs')

    if (!hasBotConfig || !hasBotLogs) {
      console.log('\n⚠️  Missing bot tables. Applying migration 0007...')
      const migration0007 = fs.readFileSync(
        path.join(__dirname, '..', 'drizzle', '0007_worthless_sphinx.sql'),
        'utf-8'
      )
      
      // Split by statement breakpoint and execute each statement
      const statements = migration0007
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 100) + '...')
        await client.execute(statement)
      }
      console.log('✅ Migration 0007 applied!')
    } else {
      console.log('✅ Bot tables already exist')
    }

    // Check if website_bonus_percentage column exists
    console.log('\n📊 Checking bot_configurations columns...')
    const columns = await client.execute(`
      PRAGMA table_info(bot_configurations)
    `)
    const hasWebsiteBonus = columns.rows.some(r => r.name === 'website_bonus_percentage')
    const hasInGameGuildId = columns.rows.some(r => r.name === 'in_game_guild_id')

    if (!hasWebsiteBonus) {
      console.log('\n⚠️  Missing website_bonus_percentage column. Applying migration 0008...')
      const migration0008 = fs.readFileSync(
        path.join(__dirname, '..', 'drizzle', '0008_bitter_steel_serpent.sql'),
        'utf-8'
      )
      
      await client.execute(migration0008.trim())
      console.log('✅ Migration 0008 applied!')
    } else {
      console.log('✅ website_bonus_percentage column already exists')
    }

    if (!hasInGameGuildId) {
      console.log('\n⚠️  Missing in_game_guild_id column. Applying migration 0012...')
      await client.execute(`
        ALTER TABLE bot_configurations ADD COLUMN in_game_guild_id TEXT
      `)
      console.log('✅ Migration 0012 applied (in_game_guild_id column added)!')
    } else {
      console.log('✅ in_game_guild_id column already exists')
    }

    // Verify final state
    console.log('\n📊 Final table list:')
    const finalTables = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `)
    console.log('Tables:', finalTables.rows.map(r => r.name).join(', '))

    console.log('\n✅ All migrations applied successfully!')
    console.log('\n🚀 Your production database is now up to date!')

  } catch (error) {
    console.error('❌ Error applying migrations:', error)
    throw error
  } finally {
    client.close()
  }
}

applyMigrations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed to apply migrations:', error)
    process.exit(1)
  })
