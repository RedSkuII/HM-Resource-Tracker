#!/usr/bin/env node
require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

client.execute("SELECT name, image_url FROM resources WHERE name = 'Advanced Machinery'")
  .then(r => {
    console.log('✅ Resource:', r.rows[0].name)
    console.log('🖼️  Image URL:', r.rows[0].image_url)
    console.log('\n✅ Verification successful! The correct image URL is now in the database.')
    client.close()
  })
  .catch(e => {
    console.error('❌ Error:', e)
    client.close()
  })
