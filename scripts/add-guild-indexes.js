import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addIndexes() {
  try {
    console.log('Creating indexes on guild_id columns...')
    
    // Add index on resources.guild_id
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_resources_guild_id ON resources(guild_id)`)
    console.log('✅ Created index on resources.guild_id')
    
    // Add index on resource_history.guild_id
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_resource_history_guild_id ON resource_history(guild_id)`)
    console.log('✅ Created index on resource_history.guild_id')
    
    // Add index on leaderboard.guild_id
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_leaderboard_guild_id ON leaderboard(guild_id)`)
    console.log('✅ Created index on leaderboard.guild_id')
    
    console.log('All indexes created successfully!')
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

addIndexes()
