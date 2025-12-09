import { createClient } from '@libsql/client'

// Hardcode credentials since .env loading might be an issue
const DATABASE_URL = 'libsql://hm-resources-tracker-redskuii.aws-us-west-2.turso.io'
const AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTg5MzYwMzQsImlkIjoiMGI1OGFiYmYtZTYxYy00N2EwLWI4YTYtMTE1NTVjNGI3OTg0IiwicmlkIjoiMjRmMzU0YjMtMTgyMy00YWU4LWFhNjEtOWYxYzVkODUzNGI5In0.GJPnQswrxA7mfepnjKNUUZZ8OVaPA5Sm97vL0K1zd5VlnmNeSVLUr0BY6HisVUSp8gyDET5GG1j5_0fudTwpBA'

async function cleanupTestGuilds() {
  console.log('🔍 Connecting to database...\n')
  
  const client = createClient({
    url: DATABASE_URL,
    authToken: AUTH_TOKEN
  })
  
  try {
    // Fetch all guilds
    console.log('📋 Fetching current guilds...')
    const guildsResult = await client.execute('SELECT id, title, discord_guild_id FROM guilds')
    
    console.log('\nCurrent guilds in database:')
    guildsResult.rows.forEach(row => {
      console.log(`  - ${row.title} (ID: ${row.id}, Discord Server: ${row.discord_guild_id})`)
    })
    
    // Test guild IDs to delete
    const testGuildIds = ['y9Ndpe-ngqPnLGW-LfHGH', '7_O3qIardsLbi6r26pSLO', 'wprzBRhmyv0MBF8a9JOpn']
    
    console.log('\n🗑️  Deleting test guilds: Test1, Test69, Test70...\n')
    
    // Step 1: Delete leaderboard entries
    console.log('  Step 1: Deleting leaderboard entries...')
    await client.execute({
      sql: `DELETE FROM leaderboard 
            WHERE resource_id IN (
              SELECT id FROM resources 
              WHERE guild_id IN (?, ?, ?)
            )`,
      args: testGuildIds
    })
    console.log('    ✅ Leaderboard entries deleted')
    
    // Step 2: Delete resource history
    console.log('  Step 2: Deleting resource history...')
    await client.execute({
      sql: `DELETE FROM resource_history 
            WHERE resource_id IN (
              SELECT id FROM resources 
              WHERE guild_id IN (?, ?, ?)
            )`,
      args: testGuildIds
    })
    console.log('    ✅ Resource history deleted')
    
    // Step 3: Delete resources
    console.log('  Step 3: Deleting resources...')
    await client.execute({
      sql: 'DELETE FROM resources WHERE guild_id IN (?, ?, ?)',
      args: testGuildIds
    })
    console.log('    ✅ Resources deleted')
    
    // Step 4: Delete guilds
    console.log('  Step 4: Deleting guilds...')
    await client.execute({
      sql: 'DELETE FROM guilds WHERE id IN (?, ?, ?)',
      args: testGuildIds
    })
    console.log('    ✅ Guilds deleted')
    
    // Verify deletion
    console.log('\n✅ Cleanup complete! Remaining guilds:')
    const remainingGuilds = await client.execute('SELECT id, title FROM guilds')
    remainingGuilds.rows.forEach(row => {
      console.log(`  - ${row.title} (ID: ${row.id})`)
    })
    
    console.log('\n🎉 Test guilds removed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.close()
  }
}

cleanupTestGuilds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
