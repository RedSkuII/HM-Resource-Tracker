/**
 * Reset Guild to Default Resources Script
 * 
 * This script completely resets specified guilds to a clean state:
 * - Deletes all existing resources
 * - Deletes all resource history entries
 * - Deletes all leaderboard entries
 * - Recreates resources from the standard 95 resource set (all at quantity 0)
 * 
 * Usage: npm run reset-guild -- house-melange whitelist-second-guild
 */

import { db, resources, resourceHistory, leaderboard } from '../lib/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Standard 95 resources that are auto-created for all new guilds
const STANDARD_RESOURCES = [
  // Raw Materials (7 resources)
  { name: 'Wood', category: 'Raw Materials', description: 'Basic construction material harvested from trees', icon: '🪵', multiplier: 1.0 },
  { name: 'Stone', category: 'Raw Materials', description: 'Fundamental building material mined from rock formations', icon: '🪨', multiplier: 1.0 },
  { name: 'Iron Ore', category: 'Raw Materials', description: 'Essential metal ore for manufacturing', icon: '⛏️', multiplier: 1.2 },
  { name: 'Copper Ore', category: 'Raw Materials', description: 'Conductive ore used in electronics and machinery', icon: '🔶', multiplier: 1.2 },
  { name: 'Sand', category: 'Raw Materials', description: 'Desert sand used for construction and glass production', icon: '⏳', multiplier: 0.8 },
  { name: 'Clay', category: 'Raw Materials', description: 'Moldable earth material for ceramics and construction', icon: '🧱', multiplier: 1.0 },
  { name: 'Coal', category: 'Raw Materials', description: 'Carbon fuel source for energy and smelting', icon: '⚫', multiplier: 1.1 },

  // Refined Materials (13 resources)
  { name: 'Plasteel', category: 'Refined Materials', description: 'Advanced composite material combining plastic and steel properties', icon: '🔩', multiplier: 1.5 },
  { name: 'Ceramics', category: 'Refined Materials', description: 'Heat-resistant material for advanced equipment', icon: '🏺', multiplier: 1.3 },
  { name: 'Composite Fiber', category: 'Refined Materials', description: 'Lightweight strong material for advanced construction', icon: '🧵', multiplier: 1.4 },
  { name: 'Processed Steel', category: 'Refined Materials', description: 'Refined steel ready for manufacturing', icon: '⚙️', multiplier: 1.3 },
  { name: 'Tempered Glass', category: 'Refined Materials', description: 'Strengthened transparent material for structures', icon: '💎', multiplier: 1.2 },
  { name: 'Rubber', category: 'Refined Materials', description: 'Elastic material for seals and components', icon: '⚫', multiplier: 1.1 },
  { name: 'Polymer Sheets', category: 'Refined Materials', description: 'Flexible synthetic material sheets', icon: '📄', multiplier: 1.3 },
  { name: 'Silicone', category: 'Refined Materials', description: 'Heat-resistant synthetic polymer', icon: '🔷', multiplier: 1.2 },
  { name: 'Carbon Fiber', category: 'Refined Materials', description: 'Ultra-lightweight strong material', icon: '⬛', multiplier: 1.6 },
  { name: 'Titanium Alloy', category: 'Refined Materials', description: 'Corrosion-resistant metal alloy', icon: '🔲', multiplier: 1.7 },
  { name: 'Graphene Sheets', category: 'Refined Materials', description: 'Revolutionary 2D material with exceptional properties', icon: '📊', multiplier: 2.0 },
  { name: 'Reinforced Concrete', category: 'Refined Materials', description: 'Strengthened construction material', icon: '🧱', multiplier: 1.1 },
  { name: 'Synthetic Resin', category: 'Refined Materials', description: 'Moldable polymer material', icon: '🟡', multiplier: 1.2 },

  // Electronics (10 resources)
  { name: 'Circuit Boards', category: 'Electronics', description: 'Essential component for all electronic devices', icon: '💻', multiplier: 1.6 },
  { name: 'Microprocessors', category: 'Electronics', description: 'Advanced computing components', icon: '🔬', multiplier: 2.0 },
  { name: 'Sensors', category: 'Electronics', description: 'Detection and monitoring devices', icon: '📡', multiplier: 1.7 },
  { name: 'Power Cells', category: 'Electronics', description: 'Energy storage units for equipment', icon: '🔋', multiplier: 1.8 },
  { name: 'Optical Fiber', category: 'Electronics', description: 'High-speed data transmission cables', icon: '💫', multiplier: 1.5 },
  { name: 'Capacitors', category: 'Electronics', description: 'Electrical energy storage components', icon: '⚡', multiplier: 1.4 },
  { name: 'Quantum Processors', category: 'Electronics', description: 'Next-generation computing units', icon: '🔮', multiplier: 2.5 },
  { name: 'Holographic Displays', category: 'Electronics', description: '3D projection systems', icon: '📺', multiplier: 1.9 },
  { name: 'Neural Interface Chips', category: 'Electronics', description: 'Brain-computer interface components', icon: '🧠', multiplier: 2.2 },
  { name: 'Plasma Conduits', category: 'Electronics', description: 'High-energy transmission systems', icon: '🌟', multiplier: 1.8 },

  // Energy Systems (8 resources)
  { name: 'Fusion Cores', category: 'Energy Systems', description: 'Primary power source for facilities', icon: '☢️', multiplier: 2.5 },
  { name: 'Solar Panels', category: 'Energy Systems', description: 'Renewable energy collectors', icon: '☀️', multiplier: 1.3 },
  { name: 'Wind Turbines', category: 'Energy Systems', description: 'Wind-powered generators', icon: '💨', multiplier: 1.4 },
  { name: 'Thermal Generators', category: 'Energy Systems', description: 'Heat-based power systems', icon: '🔥', multiplier: 1.5 },
  { name: 'Battery Packs', category: 'Energy Systems', description: 'Portable power storage', icon: '🔋', multiplier: 1.4 },
  { name: 'Power Converters', category: 'Energy Systems', description: 'Energy transformation systems', icon: '🔌', multiplier: 1.3 },
  { name: 'Antimatter Cells', category: 'Energy Systems', description: 'Exotic high-density power source', icon: '✨', multiplier: 3.0 },
  { name: 'Zero-Point Modules', category: 'Energy Systems', description: 'Vacuum energy extraction devices', icon: '🌀', multiplier: 3.5 },

  // Manufacturing Components (15 resources)
  { name: 'Hydraulic Systems', category: 'Manufacturing Components', description: 'Fluid-powered mechanical systems', icon: '💧', multiplier: 1.5 },
  { name: 'Servo Motors', category: 'Manufacturing Components', description: 'Precision movement actuators', icon: '⚙️', multiplier: 1.6 },
  { name: 'Conveyor Belts', category: 'Manufacturing Components', description: 'Automated transport systems', icon: '➡️', multiplier: 1.2 },
  { name: 'Robotic Arms', category: 'Manufacturing Components', description: 'Automated assembly equipment', icon: '🦾', multiplier: 1.8 },
  { name: 'CNC Components', category: 'Manufacturing Components', description: 'Computer-controlled machining parts', icon: '🔧', multiplier: 1.7 },
  { name: 'Industrial Bearings', category: 'Manufacturing Components', description: 'Low-friction rotation components', icon: '⚪', multiplier: 1.3 },
  { name: 'Pneumatic Pistons', category: 'Manufacturing Components', description: 'Air-powered actuators', icon: '🔩', multiplier: 1.4 },
  { name: 'Laser Cutting Arrays', category: 'Manufacturing Components', description: 'Precision material cutting systems', icon: '🔺', multiplier: 1.9 },
  { name: '3D Printer Modules', category: 'Manufacturing Components', description: 'Additive manufacturing components', icon: '🖨️', multiplier: 1.7 },
  { name: 'Assembly Line Units', category: 'Manufacturing Components', description: 'Automated production systems', icon: '🏭', multiplier: 1.6 },
  { name: 'Quality Control Scanners', category: 'Manufacturing Components', description: 'Product inspection systems', icon: '🔍', multiplier: 1.5 },
  { name: 'Material Feeders', category: 'Manufacturing Components', description: 'Automated resource distribution', icon: '📦', multiplier: 1.3 },
  { name: 'Welding Equipment', category: 'Manufacturing Components', description: 'Metal joining systems', icon: '🔥', multiplier: 1.4 },
  { name: 'Cooling Systems', category: 'Manufacturing Components', description: 'Temperature regulation equipment', icon: '❄️', multiplier: 1.5 },
  { name: 'Filtration Units', category: 'Manufacturing Components', description: 'Air and fluid purification systems', icon: '🌪️', multiplier: 1.4 },

  // Chemicals (12 resources)
  { name: 'Lubricants', category: 'Chemicals', description: 'Friction-reducing compounds', icon: '🛢️', multiplier: 1.2 },
  { name: 'Coolants', category: 'Chemicals', description: 'Heat dissipation fluids', icon: '❄️', multiplier: 1.2 },
  { name: 'Solvents', category: 'Chemicals', description: 'Cleaning and dissolving agents', icon: '🧪', multiplier: 1.3 },
  { name: 'Adhesives', category: 'Chemicals', description: 'Bonding compounds', icon: '🩹', multiplier: 1.1 },
  { name: 'Synthetic Fuel', category: 'Chemicals', description: 'Manufactured energy source', icon: '⛽', multiplier: 1.5 },
  { name: 'Catalyst Compounds', category: 'Chemicals', description: 'Reaction acceleration agents', icon: '⚗️', multiplier: 1.8 },
  { name: 'Nanobots', category: 'Chemicals', description: 'Microscopic repair and construction units', icon: '🦠', multiplier: 2.5 },
  { name: 'Acid Solutions', category: 'Chemicals', description: 'Corrosive processing agents', icon: '🧴', multiplier: 1.4 },
  { name: 'Polymer Resins', category: 'Chemicals', description: 'Plastic precursor materials', icon: '🟣', multiplier: 1.3 },
  { name: 'Explosive Compounds', category: 'Chemicals', description: 'Controlled demolition materials', icon: '💥', multiplier: 1.7 },
  { name: 'Medical Compounds', category: 'Chemicals', description: 'Pharmaceutical ingredients', icon: '💊', multiplier: 1.6 },
  { name: 'Preservatives', category: 'Chemicals', description: 'Anti-degradation agents', icon: '🧂', multiplier: 1.2 },

  // Advanced Tech (10 resources)
  { name: 'AI Cores', category: 'Advanced Tech', description: 'Artificial intelligence processing units', icon: '🤖', multiplier: 3.0 },
  { name: 'Warp Coils', category: 'Advanced Tech', description: 'Faster-than-light propulsion components', icon: '🌌', multiplier: 3.5 },
  { name: 'Shield Generators', category: 'Advanced Tech', description: 'Protective field emitters', icon: '🛡️', multiplier: 2.8 },
  { name: 'Teleportation Pads', category: 'Advanced Tech', description: 'Instant transport systems', icon: '🚪', multiplier: 3.2 },
  { name: 'Cloaking Devices', category: 'Advanced Tech', description: 'Invisibility field generators', icon: '👻', multiplier: 2.9 },
  { name: 'Gravity Manipulators', category: 'Advanced Tech', description: 'Artificial gravity control systems', icon: '🌑', multiplier: 3.1 },
  { name: 'Temporal Stabilizers', category: 'Advanced Tech', description: 'Time dilation control units', icon: '⏰', multiplier: 3.8 },
  { name: 'Matter Replicators', category: 'Advanced Tech', description: 'Molecular assembly systems', icon: '✨', multiplier: 4.0 },
  { name: 'Psionic Amplifiers', category: 'Advanced Tech', description: 'Mental enhancement devices', icon: '🔮', multiplier: 2.7 },
  { name: 'Quantum Entanglement Communicators', category: 'Advanced Tech', description: 'Instantaneous communication devices', icon: '📡', multiplier: 3.3 },

  // Medical Supplies (8 resources)
  { name: 'Medkits', category: 'Medical Supplies', description: 'Emergency medical treatment packs', icon: '⛑️', multiplier: 1.5 },
  { name: 'Surgical Tools', category: 'Medical Supplies', description: 'Precision medical instruments', icon: '🔬', multiplier: 1.7 },
  { name: 'Vaccines', category: 'Medical Supplies', description: 'Disease prevention compounds', icon: '💉', multiplier: 1.8 },
  { name: 'Antibiotics', category: 'Medical Supplies', description: 'Infection treatment medications', icon: '💊', multiplier: 1.6 },
  { name: 'Diagnostic Equipment', category: 'Medical Supplies', description: 'Health monitoring systems', icon: '🩺', multiplier: 1.9 },
  { name: 'Stasis Pods', category: 'Medical Supplies', description: 'Medical preservation chambers', icon: '🛌', multiplier: 2.5 },
  { name: 'Regeneration Serums', category: 'Medical Supplies', description: 'Advanced healing compounds', icon: '🧬', multiplier: 2.3 },
  { name: 'Cybernetic Parts', category: 'Medical Supplies', description: 'Prosthetic replacement components', icon: '🦿', multiplier: 2.1 },

  // Defense Systems (12 resources)
  { name: 'Weapon Platforms', category: 'Defense Systems', description: 'Automated defense turrets', icon: '🔫', multiplier: 2.0 },
  { name: 'Armor Plating', category: 'Defense Systems', description: 'Protective hull reinforcement', icon: '🛡️', multiplier: 1.7 },
  { name: 'Missile Systems', category: 'Defense Systems', description: 'Long-range defense weapons', icon: '🚀', multiplier: 2.2 },
  { name: 'EMP Generators', category: 'Defense Systems', description: 'Electronic warfare devices', icon: '⚡', multiplier: 2.1 },
  { name: 'Stealth Modules', category: 'Defense Systems', description: 'Radar evasion systems', icon: '🌫️', multiplier: 2.3 },
  { name: 'Point Defense Arrays', category: 'Defense Systems', description: 'Anti-projectile systems', icon: '🎯', multiplier: 2.0 },
  { name: 'Barricades', category: 'Defense Systems', description: 'Physical barrier systems', icon: '🚧', multiplier: 1.3 },
  { name: 'Surveillance Drones', category: 'Defense Systems', description: 'Automated monitoring units', icon: '🛸', multiplier: 1.8 },
  { name: 'Mine Fields', category: 'Defense Systems', description: 'Explosive perimeter defense', icon: '💣', multiplier: 1.6 },
  { name: 'Force Fields', category: 'Defense Systems', description: 'Energy barrier systems', icon: '🔷', multiplier: 2.5 },
  { name: 'Laser Defense Grid', category: 'Defense Systems', description: 'High-energy perimeter protection', icon: '🔺', multiplier: 2.4 },
  { name: 'Jamming Arrays', category: 'Defense Systems', description: 'Communication disruption systems', icon: '📻', multiplier: 1.9 }
]

async function resetGuildToDefaults() {
  const guildsToReset = process.argv.slice(2)
  
  if (guildsToReset.length === 0) {
    console.log('❌ No guilds specified!')
    console.log('Usage: npm run reset-guild -- house-melange whitelist-second-guild')
    process.exit(1)
  }

  console.log('🔄 Starting guild reset to defaults...\n')
  console.log(`📋 Guilds to reset: ${guildsToReset.join(', ')}\n`)

  for (const guildId of guildsToReset) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📋 Processing guild: ${guildId}`)
    console.log('='.repeat(60))

    try {
      // 1. Delete all existing resources for this guild
      console.log(`\n🗑️  Deleting existing resources for ${guildId}...`)
      const deletedResources = await db.delete(resources)
        .where(eq(resources.guildId, guildId))
        .returning()
      console.log(`   ✅ Deleted ${deletedResources.length} resources`)

      // 2. Delete all resource history for this guild
      console.log(`\n🗑️  Deleting resource history for ${guildId}...`)
      const deletedHistory = await db.delete(resourceHistory)
        .where(eq(resourceHistory.guildId, guildId))
        .returning()
      console.log(`   ✅ Deleted ${deletedHistory.length} history entries`)

      // 3. Delete all leaderboard entries for this guild
      console.log(`\n🗑️  Deleting leaderboard entries for ${guildId}...`)
      const deletedLeaderboard = await db.delete(leaderboard)
        .where(eq(leaderboard.guildId, guildId))
        .returning()
      console.log(`   ✅ Deleted ${deletedLeaderboard.length} leaderboard entries`)

      // 4. Create standard 95 resources with quantity 0
      console.log(`\n✨ Creating ${STANDARD_RESOURCES.length} standard resources for ${guildId}...`)
      
      const resourceData = STANDARD_RESOURCES.map(resource => ({
        id: nanoid(),
        guildId: guildId,
        name: resource.name,
        category: resource.category,
        description: resource.description,
        icon: resource.icon,
        multiplier: resource.multiplier,
        quantity: 0,
        targetQuantity: null,
        status: 'critical',
        lastUpdatedBy: 'system-reset',
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      await db.insert(resources).values(resourceData)
      console.log(`   ✅ Created ${STANDARD_RESOURCES.length} resources`)

      console.log(`\n✅ Successfully reset ${guildId} to defaults!`)
      console.log(`\n📊 Summary for ${guildId}:`)
      console.log(`   - Resources deleted: ${deletedResources.length}`)
      console.log(`   - History entries deleted: ${deletedHistory.length}`)
      console.log(`   - Leaderboard entries deleted: ${deletedLeaderboard.length}`)
      console.log(`   - New resources created: ${STANDARD_RESOURCES.length}`)

    } catch (error) {
      console.error(`\n❌ Error resetting guild ${guildId}:`, error)
      throw error
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ All guilds reset to defaults!')
  console.log('='.repeat(60))
  console.log(`\n📊 Total guilds processed: ${guildsToReset.length}`)
  console.log('💡 All guilds now have 95 standard resources at quantity 0')
  console.log('💡 No activity history or leaderboard data')
  console.log('💡 Users can start fresh!\n')
}

// Run the reset
resetGuildToDefaults()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
