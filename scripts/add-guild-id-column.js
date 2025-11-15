const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function addGuildIdColumn() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })

    console.log('🔧 Adding guild_id column to resources table...\n')

    // Add guild_id column
    await client.execute('ALTER TABLE resources ADD COLUMN guild_id TEXT')
    console.log('✅ Added guild_id column to resources\n')

    // Also add to resource_history if it exists
    try {
      await client.execute('ALTER TABLE resource_history ADD COLUMN guild_id TEXT')
      console.log('✅ Added guild_id column to resource_history\n')
    } catch (e) {
      console.log('⚠️ Could not add guild_id to resource_history (may already exist or table missing)\n')
    }

    // Add to leaderboard if it exists
    try {
      await client.execute('ALTER TABLE leaderboard ADD COLUMN guild_id TEXT')
      console.log('✅ Added guild_id column to leaderboard\n')
    } catch (e) {
      console.log('⚠️ Could not add guild_id to leaderboard (may already exist or table missing)\n')
    }

    // Verify
    const schema = await client.execute("PRAGMA table_info(resources)")
    console.log('Updated resources schema:')
    schema.rows.forEach(col => {
      console.log(`  - ${col.name}`)
    })

    console.log('\n✅ Migration complete!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

if (require.main === module) {
  addGuildIdColumn()
    .then(() => {
      console.log('\n🏁 Done!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Failed:', error)
      process.exit(1)
    })
}
