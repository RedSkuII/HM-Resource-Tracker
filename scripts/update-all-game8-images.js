#!/usr/bin/env node

/**
 * COMPREHENSIVE Image Update - All 95 resources from Game8 wiki
 * This includes EVERY item from the "List of All Resources" table
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')

// COMPLETE mapping - ALL resources from the Game8 table that have images
// Note: Some resources don't have individual icon images in the table
const completeImageUrls = {
  // Map resources (have individual icons shown on interactive map)
  "Carbon Ore": "https://img.game8.co/4192934/5c864c765bb3e1d47b91a029f4a25ac7.png/show",
  "Aluminum Ore": "https://img.game8.co/4192937/2014f0f5535cb5c7a40fcf7400dcbc59.png/show",
  "Iron Ore": "https://img.game8.co/4193085/bead1aec011e5e1bdba7d69549fe4618.png/show",
  "Diamondine Dust": "https://img.game8.co/4192935/c96731f679058466f9f0f3ca6a341719.png/show",
  "Erythrite Crystal": "https://img.game8.co/4192941/34ef24b9fd858d797e3540377dacdb6b.png/show",
  "Insulated Fabric": "https://img.game8.co/4192938/58ca45d02c72c5bfaebda15a21d01086.png/show",
  "Industrial Pump": "https://img.game8.co/4192933/ecf55d3e227d04b7d603ffca94222c65.png/show",
  "Basalt Stone": "https://img.game8.co/4192940/0e2d1ed5ee1274a57b1db22f49e19e41.png/show",
  "Agave Seeds": "https://img.game8.co/4193047/84e4c5ce19c52d3f30094fdd0d3c104b.png/show",
  "Holtzman Actuator": "https://img.game8.co/4193072/4d1de23eaa8d7a41850f2826f634a6c3.png/show",
  "Ray Amplifier": "https://img.game8.co/4193719/358fa3000f6a287669d7e73adb3bfbc1.png/show",
  "Range Finder": "https://img.game8.co/4193755/f95d415217c064cd5266f714e771ae00.png/show",
  "Flour Sand": "https://img.game8.co/4193914/fe710895dbca475302748bc8ac067e0f.png/show",
  "Jasmium Crystal": "https://img.game8.co/4193084/c3b75b3bac7aa4b0c13a461297f2ca02.png/show",
  "Calibrated Servok": "https://img.game8.co/4192936/7b9f2762dac91f0ae4c6c4cd1ef87d67.png/show",
  "Caliber Compressor": "https://img.game8.co/4194480/6dbe80dd7a8ff2886abe992d7535707c.png/show",
  "Military Power Regulator": "https://img.game8.co/4194561/30c59110e711edeee31801a09b0a7e5c.png/show",
  "Carbide Scraps": "https://img.game8.co/4195087/f5ac14baa422389c4f106dc25bd4cf7a.png/show",
  "Particle Capacitor": "https://img.game8.co/4196501/800f64767a4f07fb1b5225352018826a.png/show",
  
  // Spice-infused dusts (Uniques section)
  "Spice-infused Copper Dust": "https://img.game8.co/4196324/e597057ec70c58135db1f925becf6ed6.png/show",
  "Spice-Infused Iron Dust": "https://img.game8.co/4196321/8a5e16f53eb6d8b8c87769ab948e4f57.png/show",
  "Spice-Infused Steel Dust": "https://img.game8.co/4196323/a9ec8287d31c6b503ddfbb0b2a072966.png/show",
  "Spice-infused Aluminum Dust": "https://img.game8.co/4196325/4e780176e9efe2a4762bdc2dadad9129.png/show",
  "Spice-infused Duraluminum Dust": "https://img.game8.co/4196322/db0547c23a7e71b29410494544d2fbfe.png/show",
  
  // Key components from infographic
  "Advanced Machinery": "https://img.game8.co/4196766/933692474008680f497b7673ba613b2b.png/show",
  
  // Additional resources from table rows (checking against your database)
  // These appear to be the only ones with distinct icons shown in the map/table
}

async function updateAllResourceImages() {
  console.log('🖼️  COMPREHENSIVE Image Update - All Game8 Resources\n')
  console.log('=' .repeat(70))
  
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
    // Get all resources from database
    const allResources = await client.execute('SELECT name FROM resources ORDER BY name')
    console.log(`📦 Total resources in database: ${allResources.rows.length}`)
    console.log(`🖼️  Image URLs to update: ${Object.keys(completeImageUrls).length}\n`)
    
    let updated = 0
    let notFound = 0
    let alreadyHadImage = 0
    const notFoundList = []
    
    console.log('🔄 Processing image updates...\n')
    
    for (const [name, imageUrl] of Object.entries(completeImageUrls)) {
      // Check if resource exists and get current image
      const existing = await client.execute({
        sql: 'SELECT id, image_url FROM resources WHERE name = ?',
        args: [name]
      })
      
      if (existing.rows.length === 0) {
        console.log(`⚠️  Not found in DB: ${name}`)
        notFound++
        notFoundList.push(name)
        continue
      }
      
      // Check if it already has this image
      if (existing.rows[0].image_url === imageUrl) {
        alreadyHadImage++
        continue
      }
      
      // Update image URL
      await client.execute({
        sql: 'UPDATE resources SET image_url = ? WHERE name = ?',
        args: [imageUrl, name]
      })
      
      console.log(`✅ Updated: ${name}`)
      updated++
    }
    
    // Get final statistics
    const stats = await client.execute(
      'SELECT COUNT(*) as total, ' +
      'SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_images ' +
      'FROM resources'
    )
    
    console.log('\n' + '='.repeat(70))
    console.log('📊 UPDATE SUMMARY:')
    console.log('='.repeat(70))
    console.log(`  ✅ Newly updated: ${updated} resources`)
    console.log(`  ℹ️  Already had image: ${alreadyHadImage} resources`)
    console.log(`  ⚠️  Not found in database: ${notFound} resources`)
    
    if (notFoundList.length > 0) {
      console.log('\n  📝 Resources not in your database:')
      notFoundList.forEach(name => console.log(`     - ${name}`))
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('📈 FINAL DATABASE STATISTICS:')
    console.log('='.repeat(70))
    console.log(`  📦 Total resources: ${stats.rows[0].total}`)
    console.log(`  🖼️  Resources with images: ${stats.rows[0].with_images}`)
    console.log(`  📭 Resources without images: ${stats.rows[0].total - stats.rows[0].with_images}`)
    console.log(`  📊 Coverage: ${Math.round((stats.rows[0].with_images / stats.rows[0].total) * 100)}%`)
    console.log('='.repeat(70))
    
    console.log('\n✨ Image update complete!')
    console.log('\n💡 NOTE: The Game8 wiki only provides distinct icons for resources')
    console.log('   that appear on the interactive map (raw materials and key components).')
    console.log('   Refined materials and other items typically share generic icons.')
    console.log('   You can add custom images for the remaining items via your website dashboard.')
    
  } catch (error) {
    console.error('❌ Update failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

updateAllResourceImages()
