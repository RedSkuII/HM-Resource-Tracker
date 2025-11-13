const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.production' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'bot_%' ORDER BY name")
  .then(result => {
    console.log('Bot tables:', result.rows.map(r => r.name))
    client.close()
  })
  .catch(error => {
    console.error('Error:', error)
    client.close()
    process.exit(1)
  })
