#!/usr/bin/env node

/**
 * Download and Update Resource Images from Game8
 * Scrapes images from Game8 wiki and updates database with image URLs
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')
const https = require('https')
const fs = require('fs')
const path = require('path')

// Mapping of resource names to their Game8 image URLs
const imageUrls = {
  "Advanced Machinery": "https://img.game8.co/4196766/933692474008680f497b7673ba613b2b.png/show",
  "Agave Seeds": "https://img.game8.co/4193047/84e4c5ce19c52d3f30094fdd0d3c104b.png/show",
  "Aluminum Ore": "https://img.game8.co/4192937/2014f0f5535cb5c7a40fcf7400dcbc59.png/show",
  "Basalt Stone": "https://img.game8.co/4192940/0e2d1ed5ee1274a57b1db22f49e19e41.png/show",
  "Calibrated Servok": "https://img.game8.co/4192936/7b9f2762dac91f0ae4c6c4cd1ef87d67.png/show",
  "Caliber Compressor": "https://img.game8.co/4194480/6dbe80dd7a8ff2886abe992d7535707c.png/show",
  "Carbon Ore": "https://img.game8.co/4192934/5c864c765bb3e1d47b91a029f4a25ac7.png/show",
  "Carbide Scraps": "https://img.game8.co/4195087/f5ac14baa422389c4f106dc25bd4cf7a.png/show",
  "Diamondine Dust": "https://img.game8.co/4192935/c96731f679058466f9f0f3ca6a341719.png/show",
  "Erythrite Crystal": "https://img.game8.co/4192941/34ef24b9fd858d797e3540377dacdb6b.png/show",
  "Flour Sand": "https://img.game8.co/4193914/fe710895dbca475302748bc8ac067e0f.png/show",
  "Holtzman Actuator": "https://img.game8.co/4193072/4d1de23eaa8d7a41850f2826f634a6c3.png/show",
  "Industrial Pump": "https://img.game8.co/4192933/ecf55d3e227d04b7d603ffca94222c65.png/show",
  "Insulated Fabric": "https://img.game8.co/4192938/58ca45d02c72c5bfaebda15a21d01086.png/show",
  "Iron Ore": "https://img.game8.co/4193085/bead1aec011e5e1bdba7d69549fe4618.png/show",
  "Jasmium Crystal": "https://img.game8.co/4193084/c3b75b3bac7aa4b0c13a461297f2ca02.png/show",
  "Military Power Regulator": "https://img.game8.co/4194561/30c59110e711edeee31801a09b0a7e5c.png/show",
  "Particle Capacitor": "https://img.game8.co/4196501/800f64767a4f07fb1b5225352018826a.png/show",
  "Range Finder": "https://img.game8.co/4193755/f95d415217c064cd5266f714e771ae00.png/show",
  "Ray Amplifier": "https://img.game8.co/4193719/358fa3000f6a287669d7e73adb3bfbc1.png/show",
  "Spice-infused Aluminum Dust": "https://img.game8.co/4196325/4e780176e9efe2a4762bdc2dadad9129.png/show",
  "Spice-infused Copper Dust": "https://img.game8.co/4196324/e597057ec70c58135db1f925becf6ed6.png/show",
  "Spice-infused Duraluminum Dust": "https://img.game8.co/4196322/db0547c23a7e71b29410494544d2fbfe.png/show",
  "Spice-Infused Iron Dust": "https://img.game8.co/4196321/8a5e16f53eb6d8b8c87769ab948e4f57.png/show",
  "Spice-Infused Steel Dust": "https://img.game8.co/4196323/a9ec8287d31c6b503ddfbb0b2a072966.png/show"
}

async function updateImages() {
  console.log('🖼️  Starting image URL update...')
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }
  
  console.log('📡 Connecting to Turso database...')
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  
  try {
    let updated = 0
    let notFound = 0
    
    console.log(`\n🔄 Processing ${Object.keys(imageUrls).length} items with images...\n`)
    
    for (const [name, imageUrl] of Object.entries(imageUrls)) {
      // Check if resource exists
      const existing = await client.execute({
        sql: 'SELECT id FROM resources WHERE name = ?',
        args: [name]
      })
      
      if (existing.rows.length === 0) {
        console.log(`⚠️  Not found in DB: ${name}`)
        notFound++
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
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Update Summary:')
    console.log(`  ✅ Updated: ${updated} items`)
    console.log(`  ⚠️  Not found: ${notFound} items`)
    console.log('='.repeat(50))
    console.log('\n🎉 Image URLs updated successfully!')
    console.log('\n💡 Note: Only 25 items have images from Game8.')
    console.log('   The rest can be added manually via the website dashboard.')
    
  } catch (error) {
    console.error('❌ Update failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

updateImages()
