require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function cleanup() {
  try {
    console.log('🔄 Cleaning up default guild and reassigning to House Melange...\n')
    
    // Update resources
    const resourcesResult = await client.execute({
      sql: `UPDATE resources SET guild_id = ? WHERE guild_id = ?`,
      args: ['house-melange', 'default-guild']
    })
    console.log(`✅ Updated ${resourcesResult.rowsAffected} resources`)
    
    // Update resource_history
    const historyResult = await client.execute({
      sql: `UPDATE resource_history SET guild_id = ? WHERE guild_id = ?`,
      args: ['house-melange', 'default-guild']
    })
    console.log(`✅ Updated ${historyResult.rowsAffected} history entries`)
    
    // Update leaderboard
    const leaderboardResult = await client.execute({
      sql: `UPDATE leaderboard SET guild_id = ? WHERE guild_id = ?`,
      args: ['house-melange', 'default-guild']
    })
    console.log(`✅ Updated ${leaderboardResult.rowsAffected} leaderboard entries`)
    
    // Delete default guild
    await client.execute({
      sql: `DELETE FROM guilds WHERE id = ?`,
      args: ['default-guild']
    })
    console.log(`✅ Deleted default guild\n`)
    
    // Verify
    const guilds = await client.execute(`SELECT * FROM guilds ORDER BY title`)
    console.log('📋 Remaining guilds:')
    for (const guild of guilds.rows) {
      const resources = await client.execute({
        sql: `SELECT COUNT(*) as count FROM resources WHERE guild_id = ?`,
        args: [guild.id]
      })
      console.log(`  - ${guild.title} (${guild.id}): ${resources.rows[0].count} resources`)
    }
    
    console.log('\n🎉 Cleanup complete!')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    throw error
  }
}

cleanup().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
