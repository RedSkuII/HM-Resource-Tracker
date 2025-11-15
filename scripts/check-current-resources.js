const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function checkResources() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })

    console.log('📊 Checking current resources...\n')

    // Get all resources count
    const totalCount = await client.execute('SELECT COUNT(*) as count FROM resources')
    console.log('\nTotal resources:', totalCount.rows[0].count)

    // Get sample resources
    const sample = await client.execute('SELECT * FROM resources LIMIT 5')
    console.log('\nSample resources (first 5):')
    sample.rows.forEach(r => {
      console.log(`- ${r.name} (${r.category}): ${r.quantity} units, imageUrl: ${r.image_url ? 'YES' : 'NO'}`)
    })

    // Check if we have resources with images
    const withImages = await client.execute('SELECT COUNT(*) as count FROM resources WHERE image_url IS NOT NULL AND image_url != ""')
    console.log('\nResources with images:', withImages.rows[0].count)

    // Get all unique categories
    const categories = await client.execute('SELECT DISTINCT category FROM resources WHERE category IS NOT NULL ORDER BY category')
    console.log('\nCategories:')
    console.log(categories.rows.map(r => r.category).join(', '))
    
    // Check guilds table
    const guilds = await client.execute('SELECT id, discord_guild_id, title FROM guilds')
    console.log('\nGuilds:')
    console.log(JSON.stringify(guilds.rows, null, 2))

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkResources()
