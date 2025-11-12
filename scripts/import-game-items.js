#!/usr/bin/env node

/**
 * Bulk Import Game Items to Turso Database
 * Imports all Dune Awakening resources with proper categorization
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')
const { customAlphabet } = require('nanoid')

// Generate IDs similar to the website
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

const gameItems = [
  { name: "Advanced Machinery", category: "Component" },
  { name: "Advanced Particulate Filter", category: "Refined" },
  { name: "Advanced Servoks", category: "Component" },
  { name: "Agave Seeds", category: "Raw" },
  { name: "Aluminum Ingot", category: "Refined" },
  { name: "Aluminum Ore", category: "Raw" },
  { name: "Armor Plating", category: "Component" },
  { name: "Atmospheric Filtered Fabric", category: "Component" },
  { name: "Ballistic Weave Fabric", category: "Component" },
  { name: "Basalt Stone", category: "Raw" },
  { name: "Blade Parts", category: "Component" },
  { name: "Calibrated Servok", category: "Component" },
  { name: "Carbide Blade Parts", category: "Component" },
  { name: "Carbide Scraps", category: "Component" },
  { name: "Carbon Ore", category: "Raw" },
  { name: "Cobalt Paste", category: "Refined" },
  { name: "Complex Machinery", category: "Component" },
  { name: "Copper Ingot", category: "Refined" },
  { name: "Copper Ore", category: "Raw" },
  { name: "Corpse", category: "Raw" },
  { name: "Diamodine Blade Parts", category: "Component" },
  { name: "Diamondine Dust", category: "Component" },
  { name: "Duraluminum Ingot", category: "Refined" },
  { name: "EMF Generator", category: "Component" },
  { name: "Erythrite Crystal", category: "Raw" },
  { name: "Flour Sand", category: "Raw" },
  { name: "Fluid Efficient Industrial Pump", category: "Component" },
  { name: "Fluted Heavy Caliber Compressor", category: "Component" },
  { name: "Fluted Light Caliber Compressor", category: "Component" },
  { name: "Fuel Cell", category: "Raw" },
  { name: "Granite Stone", category: "Raw" },
  { name: "Gun Parts", category: "Component" },
  { name: "Heavy Caliber Compressor", category: "Component" },
  { name: "Holtzman Actuator", category: "Component" },
  { name: "Hydraulic Piston", category: "Component" },
  { name: "Improved Holtzman Actuator", category: "Component" },
  { name: "Improved Watertube", category: "Component" },
  { name: "Industrial Pump", category: "Component" },
  { name: "Industrial-grade Lubricant", category: "Refined" },
  { name: "Insulated Fabric", category: "Component" },
  { name: "Iron Ingot", category: "Refined" },
  { name: "Iron Ore", category: "Raw" },
  { name: "Irradiated Core", category: "Component" },
  { name: "Irradiated Slag", category: "Component" },
  { name: "Jasmium Crystal", category: "Raw" },
  { name: "Large Vehicle Fuel", category: "Refined" },
  { name: "Light Caliber Compressor", category: "Component" },
  { name: "Low-grade Lubricant", category: "Refined" },
  { name: "Makeshift Filter", category: "Refined" },
  { name: "Mechanical Parts", category: "Component" },
  { name: "Medium Sized Vehicle Fuel Cell", category: "Refined" },
  { name: "Micro-sandwich Fabric", category: "Component" },
  { name: "Military Power Regulator", category: "Component" },
  { name: "Mouse Corpse", category: "Raw" },
  { name: "Off-world Medical Supplies", category: "Component" },
  { name: "Opafire Gem", category: "Component" },
  { name: "Overclocked Power Regulator", category: "Component" },
  { name: "Particle Capacitor", category: "Component" },
  { name: "Particulate Filter", category: "Refined" },
  { name: "Plant Fiber", category: "Raw" },
  { name: "Plastanium Ingot", category: "Refined" },
  { name: "Plasteel Composite Armor Plating", category: "Component" },
  { name: "Plasteel Composite Blade Parts", category: "Component" },
  { name: "Plasteel Composite Gun Parts", category: "Component" },
  { name: "Plasteel Microflora Fiber", category: "Component" },
  { name: "Plasteel Plate", category: "Component" },
  { name: "Plastone", category: "Refined" },
  { name: "Precision Range Finder", category: "Component" },
  { name: "Range Finder", category: "Component" },
  { name: "Ray Amplifier", category: "Component" },
  { name: "Salvaged Metal", category: "Raw" },
  { name: "Sandtrout Leathers", category: "Component" },
  { name: "Ship Manifest", category: "Component" },
  { name: "Silicone Block", category: "Refined" },
  { name: "Small Vehicle Fuel Cell", category: "Refined" },
  { name: "Solari", category: "Currency" },
  { name: "Spice Melange", category: "Refined" },
  { name: "Spice Residue", category: "Raw" },
  { name: "Spice Sand", category: "Raw" },
  { name: "Spice-infused Aluminum Dust", category: "Component" },
  { name: "Spice-infused Copper Dust", category: "Component" },
  { name: "Spice-infused Duraluminum Dust", category: "Component" },
  { name: "Spice-infused Fuel Cell", category: "Refined" },
  { name: "Spice-Infused Iron Dust", category: "Component" },
  { name: "Spice-infused Plastanium Dust", category: "Component" },
  { name: "Spice-Infused Steel Dust", category: "Component" },
  { name: "Standard Filter", category: "Refined" },
  { name: "Steel Ingot", category: "Refined" },
  { name: "Stillsuit Tubing", category: "Component" },
  { name: "Stravidium Fiber", category: "Refined" },
  { name: "Stravidium Mass", category: "Raw" },
  { name: "Thermo-Responsive Ray Amplifier", category: "Component" },
  { name: "Thermoelectric Cooler", category: "Component" },
  { name: "Titanium Ore", category: "Raw" },
  { name: "Tri-Forged Hydraulic Piston", category: "Component" }
]

async function importItems() {
  console.log('🚀 Starting bulk import of game items...')
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    console.log('Please ensure .env.production has your Turso credentials')
    process.exit(1)
  }
  
  console.log('📡 Connecting to Turso database...')
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  
  try {
    const currentTime = Math.floor(Date.now() / 1000)
    let imported = 0
    let skipped = 0
    
    console.log(`📦 Processing ${gameItems.length} items...\n`)
    
    for (const item of gameItems) {
      // Check if item already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM resources WHERE name = ?',
        args: [item.name]
      })
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped: ${item.name} (already exists)`)
        skipped++
        continue
      }
      
      // Generate unique ID
      const id = nanoid()
      
      // Insert new resource
      await client.execute({
        sql: `INSERT INTO resources (
          id, name, quantity, target_quantity, category, 
          multiplier, status, image_url, created_at, updated_at, last_updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.name,
          0,                    // Starting quantity
          1000,                 // Default target
          item.category,
          1.0,                  // Default multiplier
          'critical',           // Status (0/1000 = critical)
          null,                 // Image URL (can add later)
          currentTime,
          currentTime,
          'system_import'
        ]
      })
      
      console.log(`✅ Imported: ${item.name} (${item.category})`)
      imported++
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Import Summary:')
    console.log(`  ✅ Imported: ${imported} items`)
    console.log(`  ⏭️  Skipped: ${skipped} items (already exist)`)
    console.log(`  📦 Total: ${gameItems.length} items`)
    console.log('='.repeat(50))
    console.log('\n🎉 Import completed successfully!')
    console.log('💡 Tip: You can now add images to items via the website dashboard')
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

importItems()
