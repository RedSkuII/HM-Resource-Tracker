#!/usr/bin/env node

/**
 * Migration script for Turso production database
 * This applies the database schema to your Turso cloud database
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')
const fs = require('fs')
const path = require('path')

async function runMigrations() {
  console.log('🚀 Starting Turso database migration...')
  
  // Check if we have Turso credentials
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    console.log('Please update .env.production with your Turso credentials')
    process.exit(1)
  }
  
  console.log('📡 Connecting to Turso database...')
  console.log('Database:', process.env.TURSO_DATABASE_URL)
  
  // Create Turso client
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  
  try {
    // Read all migration files
    const migrationsDir = path.join(__dirname, '..', 'drizzle')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
    
    console.log(`📂 Found ${migrationFiles.length} migration files`)
    
    for (const file of migrationFiles) {
      console.log(`🔄 Applying migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          await client.execute(statement.trim())
        }
      }
      
      console.log(`✅ Applied: ${file}`)
    }
    
    // Verify tables exist
    console.log('🔍 Verifying database structure...')
    const tables = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    
    console.log('📋 Created tables:')
    tables.rows.forEach(row => {
      console.log(`  - ${row.name}`)
    })
    
    console.log('🎉 Migration completed successfully!')
    console.log('Your Turso database is ready for production!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

runMigrations()