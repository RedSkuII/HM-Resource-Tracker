const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function checkSchema() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })

    console.log('📋 Checking resources table schema...\n')

    const schema = await client.execute("PRAGMA table_info(resources)")
    console.log('Current columns:')
    schema.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ' DEFAULT ' + col.dflt_value : ''}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkSchema()
