const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.production' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

client.execute("PRAGMA table_info(bot_configurations)")
  .then(result => {
    console.log('\nbot_configurations columns:')
    result.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`)
    })
    client.close()
  })
  .catch(error => {
    console.error('Error:', error)
    client.close()
    process.exit(1)
  })
