#!/usr/bin/env node

/**
 * Remove all images added from Game8
 * Sets image_url to NULL for all resources
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')

async function removeAllImages() {
  console.log('🗑️  Removing all images from resources...\n')
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }
  
  console.log('📡 Connecting to production database...')
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  
  try {
    // Get count before
    const before = await client.execute(
      'SELECT COUNT(*) as total, SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_images FROM resources'
    )
    
    console.log(`📊 Before removal:`)
    console.log(`   Total resources: ${before.rows[0].total}`)
    console.log(`   With images: ${before.rows[0].with_images}\n`)
    
    // Remove all images
    console.log('🔄 Removing all image URLs...')
    await client.execute('UPDATE resources SET image_url = NULL')
    
    // Get count after
    const after = await client.execute(
      'SELECT COUNT(*) as total, SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_images FROM resources'
    )
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ All images removed successfully!')
    console.log('='.repeat(50))
    console.log(`📊 After removal:`)
    console.log(`   Total resources: ${after.rows[0].total}`)
    console.log(`   With images: ${after.rows[0].with_images || 0}`)
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Removal failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

removeAllImages()
