#!/usr/bin/env node

/**
 * Check which resources have images
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')

async function checkImages() {
  console.log('🖼️  Checking resource images...\n')
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  
  try {
    const withImages = await client.execute({
      sql: 'SELECT name, category, image_url FROM resources WHERE image_url IS NOT NULL ORDER BY name',
      args: []
    })
    
    const withoutImages = await client.execute({
      sql: 'SELECT name, category FROM resources WHERE image_url IS NULL ORDER BY name',
      args: []
    })
    
    console.log('✅ Resources WITH Images (' + withImages.rows.length + '):')
    console.log('='.repeat(60))
    withImages.rows.forEach(row => {
      console.log(`  📸 ${row.name} (${row.category})`)
    })
    
    console.log('\n⚠️  Resources WITHOUT Images (' + withoutImages.rows.length + '):')
    console.log('='.repeat(60))
    withoutImages.rows.forEach(row => {
      console.log(`  📦 ${row.name} (${row.category})`)
    })
    
    console.log('\n📊 Summary:')
    console.log(`  Images added: ${withImages.rows.length}`)
    console.log(`  Missing images: ${withoutImages.rows.length}`)
    console.log(`  Total resources: ${withImages.rows.length + withoutImages.rows.length}`)
    
  } catch (error) {
    console.error('❌ Check failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

checkImages()
