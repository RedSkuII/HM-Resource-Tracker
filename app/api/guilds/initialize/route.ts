import { NextRequest, NextResponse } from 'next/server'
import { db, resources } from '@/lib/db'
import { nanoid } from 'nanoid'

// Standard 98 resources template
const STANDARD_RESOURCES = [
  // Raw Materials - Basic
  { name: 'Wood', category: 'Raw Materials', description: 'Basic construction material harvested from trees', icon: '🪵', multiplier: 1.0 },
  { name: 'Stone', category: 'Raw Materials', description: 'Fundamental building material mined from rock formations', icon: '🪨', multiplier: 1.0 },
  { name: 'Iron Ore', category: 'Raw Materials', description: 'Essential metal ore for manufacturing', icon: '⛏️', multiplier: 1.2 },
  { name: 'Copper Ore', category: 'Raw Materials', description: 'Conductive ore used in electronics and machinery', icon: '🔶', multiplier: 1.2 },
  { name: 'Sand', category: 'Raw Materials', description: 'Desert sand used for construction and glass production', icon: '⏳', multiplier: 0.8 },
  { name: 'Clay', category: 'Raw Materials', description: 'Moldable earth material for ceramics and construction', icon: '🧱', multiplier: 1.0 },
  
  // Refined Materials
  { name: 'Plasteel', category: 'Refined Materials', description: 'Advanced composite material combining plastic and steel properties', icon: '🔩', multiplier: 1.5 },
  { name: 'Ceramics', category: 'Refined Materials', description: 'Heat-resistant material for advanced equipment', icon: '🏺', multiplier: 1.3 },
  { name: 'Composite Fiber', category: 'Refined Materials', description: 'Lightweight strong material for advanced construction', icon: '🧵', multiplier: 1.4 },
  { name: 'Processed Steel', category: 'Refined Materials', description: 'Refined steel ready for manufacturing', icon: '⚙️', multiplier: 1.3 },
  { name: 'Tempered Glass', category: 'Refined Materials', description: 'Strengthened transparent material for structures', icon: '💎', multiplier: 1.2 },
  { name: 'Rubber', category: 'Refined Materials', description: 'Elastic material for seals and components', icon: '⚫', multiplier: 1.1 },
  { name: 'Polymer Sheets', category: 'Refined Materials', description: 'Flexible synthetic material sheets', icon: '📄', multiplier: 1.3 },
  
  // Electronics & Technology
  { name: 'Circuit Boards', category: 'Electronics', description: 'Essential component for all electronic devices', icon: '💻', multiplier: 1.6 },
  { name: 'Microprocessors', category: 'Electronics', description: 'Advanced computing components', icon: '🔬', multiplier: 2.0 },
  { name: 'Sensors', category: 'Electronics', description: 'Detection and monitoring devices', icon: '📡', multiplier: 1.7 },
  { name: 'Power Cells', category: 'Electronics', description: 'Energy storage units for equipment', icon: '🔋', multiplier: 1.8 },
  { name: 'Optical Fiber', category: 'Electronics', description: 'High-speed data transmission cables', icon: '💫', multiplier: 1.5 },
  { name: 'Capacitors', category: 'Electronics', description: 'Electrical energy storage components', icon: '⚡', multiplier: 1.4 },
  { name: 'Quantum Processors', category: 'Electronics', description: 'Next-generation computing units', icon: '🔮', multiplier: 2.5 },
  
  // Energy & Fuel
  { name: 'Spice Melange', category: 'Energy', description: 'The most valuable substance in the universe', icon: '🌟', multiplier: 3.0 },
  { name: 'Hydrogen Fuel', category: 'Energy', description: 'Clean burning fuel for vehicles and generators', icon: '⚛️', multiplier: 1.6 },
  { name: 'Solar Panels', category: 'Energy', description: 'Renewable energy generation equipment', icon: '☀️', multiplier: 1.8 },
  { name: 'Fusion Cores', category: 'Energy', description: 'High-density power sources', icon: '💥', multiplier: 2.5 },
  { name: 'Battery Packs', category: 'Energy', description: 'Portable power storage units', icon: '🔌', multiplier: 1.5 },
  { name: 'Coolant', category: 'Energy', description: 'Heat dissipation fluid for machinery', icon: '❄️', multiplier: 1.2 },
  
  // Water & Survival
  { name: 'Water', category: 'Survival', description: 'Most precious resource on Arrakis', icon: '💧', multiplier: 2.0 },
  { name: 'Water Reclaimed', category: 'Survival', description: 'Purified recycled water', icon: '💦', multiplier: 1.8 },
  { name: 'Stillsuit Filters', category: 'Survival', description: 'Life-saving moisture recovery components', icon: '🎭', multiplier: 2.2 },
  { name: 'Medical Supplies', category: 'Survival', description: 'Essential healthcare materials', icon: '💊', multiplier: 1.9 },
  { name: 'Food Rations', category: 'Survival', description: 'Preserved nutritional supplies', icon: '🥫', multiplier: 1.5 },
  { name: 'Oxygen Tanks', category: 'Survival', description: 'Breathable air storage for hostile environments', icon: '🫁', multiplier: 1.7 },
  { name: 'Bio-Med Scanners', category: 'Survival', description: 'Medical diagnostic equipment', icon: '🩺', multiplier: 2.0 },
  
  // Spice Processing
  { name: 'Spice Harvester Parts', category: 'Spice Operations', description: 'Components for spice mining equipment', icon: '🏗️', multiplier: 2.3 },
  { name: 'Carryall Components', category: 'Spice Operations', description: 'Parts for heavy transport vehicles', icon: '🚁', multiplier: 2.1 },
  { name: 'Thumper Devices', category: 'Spice Operations', description: 'Sandworm attraction mechanisms', icon: '🔨', multiplier: 1.9 },
  { name: 'Spice Containers', category: 'Spice Operations', description: 'Specialized storage for melange', icon: '📦', multiplier: 1.6 },
  { name: 'Filter Systems', category: 'Spice Operations', description: 'Air purification for spice operations', icon: '🌪️', multiplier: 1.8 },
  { name: 'Sand Compactors', category: 'Spice Operations', description: 'Equipment for desert terrain modification', icon: '🏜️', multiplier: 1.7 },
  
  // Weapons & Defense
  { name: 'Lasguns', category: 'Weapons', description: 'Standard laser weapon systems', icon: '🔫', multiplier: 2.0 },
  { name: 'Crysknives', category: 'Weapons', description: 'Sacred Fremen blades from sandworm teeth', icon: '🗡️', multiplier: 2.5 },
  { name: 'Maula Pistols', category: 'Weapons', description: 'Spring-loaded dart weapons', icon: '🏹', multiplier: 1.8 },
  { name: 'Shields - Personal', category: 'Weapons', description: 'Holtzman personal defense fields', icon: '🛡️', multiplier: 2.3 },
  { name: 'Explosives', category: 'Weapons', description: 'Various demolition charges', icon: '💣', multiplier: 1.9 },
  { name: 'Weapon Maintenance Kits', category: 'Weapons', description: 'Tools and supplies for weapon upkeep', icon: '🔧', multiplier: 1.5 },
  
  // Armor & Clothing
  { name: 'Stillsuits', category: 'Armor', description: 'Life-preserving desert suits', icon: '🥋', multiplier: 2.4 },
  { name: 'Combat Armor', category: 'Armor', description: 'Protective gear for battle', icon: '🦺', multiplier: 2.0 },
  { name: 'Desert Cloaks', category: 'Armor', description: 'Sand-colored camouflage robes', icon: '🧥', multiplier: 1.6 },
  { name: 'Breathing Apparatus', category: 'Armor', description: 'Emergency oxygen masks and filters', icon: '😷', multiplier: 1.8 },
  { name: 'Thermal Suits', category: 'Armor', description: 'Protection against extreme temperatures', icon: '🧊', multiplier: 1.9 },
  { name: 'Gloves - Heavy Duty', category: 'Armor', description: 'Reinforced work gloves', icon: '🧤', multiplier: 1.4 },
  
  // Vehicles & Transport
  { name: 'Ornithopter Parts', category: 'Vehicles', description: 'Components for flying craft', icon: '✈️', multiplier: 2.6 },
  { name: 'Sandcrawler Parts', category: 'Vehicles', description: 'Heavy vehicle components', icon: '🚜', multiplier: 2.4 },
  { name: 'Bike Parts', category: 'Vehicles', description: 'Personal transport vehicle components', icon: '🏍️', multiplier: 2.0 },
  { name: 'Vehicle Armor Plating', category: 'Vehicles', description: 'Protective plating for vehicles', icon: '🔰', multiplier: 2.2 },
  { name: 'Engine Components', category: 'Vehicles', description: 'Motors and propulsion systems', icon: '🔩', multiplier: 2.1 },
  { name: 'Suspension Systems', category: 'Vehicles', description: 'Shock absorption for rough terrain', icon: '⚙️', multiplier: 1.9 },
  
  // Construction
  { name: 'Concrete Mix', category: 'Construction', description: 'Building foundation material', icon: '🏗️', multiplier: 1.3 },
  { name: 'Metal Beams', category: 'Construction', description: 'Structural support components', icon: '🏢', multiplier: 1.5 },
  { name: 'Insulation Foam', category: 'Construction', description: 'Thermal and sound insulation', icon: '🔲', multiplier: 1.2 },
  { name: 'Piping Systems', category: 'Construction', description: 'Water and air circulation networks', icon: '🚰', multiplier: 1.4 },
  { name: 'Wall Panels', category: 'Construction', description: 'Pre-fabricated building sections', icon: '🧱', multiplier: 1.3 },
  { name: 'Foundation Materials', category: 'Construction', description: 'Base layer construction supplies', icon: '⬛', multiplier: 1.2 },
  { name: 'Atmospheric Processors', category: 'Construction', description: 'Air quality control systems', icon: '🌬️', multiplier: 1.9 },
  
  // Advanced Technology
  { name: 'Hologram Projectors', category: 'Advanced Tech', description: 'Three-dimensional display systems', icon: '📽️', multiplier: 2.3 },
  { name: 'Suspension Field Generators', category: 'Advanced Tech', description: 'Anti-gravity devices', icon: '🌀', multiplier: 2.8 },
  { name: 'Communication Arrays', category: 'Advanced Tech', description: 'Long-range communication equipment', icon: '📡', multiplier: 2.1 },
  { name: 'Scanning Equipment', category: 'Advanced Tech', description: 'Detection and analysis devices', icon: '🔍', multiplier: 2.0 },
  { name: 'Navigation Systems', category: 'Advanced Tech', description: 'GPS and guidance computers', icon: '🧭', multiplier: 1.9 },
  { name: 'Data Storage Devices', category: 'Advanced Tech', description: 'Information preservation systems', icon: '💾', multiplier: 1.8 },
  { name: 'Synthetic Crystals', category: 'Advanced Tech', description: 'Artificially grown precision crystals', icon: '💠', multiplier: 2.2 },
  { name: 'Null Field Emitters', category: 'Advanced Tech', description: 'Stealth and cloaking devices', icon: '👻', multiplier: 2.7 },
  
  // Tools & Equipment
  { name: 'Mining Equipment', category: 'Tools', description: 'Rock and ore extraction tools', icon: '⚒️', multiplier: 1.7 },
  { name: 'Repair Kits', category: 'Tools', description: 'General maintenance supplies', icon: '🔧', multiplier: 1.5 },
  { name: 'Cutting Tools', category: 'Tools', description: 'Precision cutting implements', icon: '✂️', multiplier: 1.4 },
  { name: 'Welding Equipment', category: 'Tools', description: 'Metal joining apparatus', icon: '🔥', multiplier: 1.6 },
  { name: 'Measuring Devices', category: 'Tools', description: 'Precision measurement instruments', icon: '📏', multiplier: 1.3 },
  { name: 'Power Tools', category: 'Tools', description: 'Motorized work equipment', icon: '🔌', multiplier: 1.6 },
  { name: 'Recycling Units', category: 'Tools', description: 'Resource recovery systems', icon: '♻️', multiplier: 1.8 },
  
  // Chemicals & Compounds
  { name: 'Industrial Chemicals', category: 'Chemicals', description: 'Various processing agents', icon: '🧪', multiplier: 1.7 },
  { name: 'Explosives - Raw', category: 'Chemicals', description: 'Unstable chemical compounds', icon: '💥', multiplier: 2.0 },
  { name: 'Lubricants', category: 'Chemicals', description: 'Friction-reducing oils and greases', icon: '🛢️', multiplier: 1.3 },
  { name: 'Cleaning Agents', category: 'Chemicals', description: 'Maintenance and sanitation supplies', icon: '🧼', multiplier: 1.1 },
  { name: 'Adhesives', category: 'Chemicals', description: 'Bonding and sealing compounds', icon: '📎', multiplier: 1.2 },
  { name: 'Preservatives', category: 'Chemicals', description: 'Material longevity enhancers', icon: '🧂', multiplier: 1.4 },
  
  // Intelligence & Data
  { name: 'Intelligence Reports', category: 'Intelligence', description: 'Gathered tactical information', icon: '📊', multiplier: 2.2 },
  { name: 'Encrypted Data Modules', category: 'Intelligence', description: 'Secured information storage', icon: '🔐', multiplier: 2.4 },
  { name: 'Maps - Detailed', category: 'Intelligence', description: 'Precise territorial charts', icon: '🗺️', multiplier: 1.9 },
  { name: 'Surveillance Equipment', category: 'Intelligence', description: 'Monitoring and tracking devices', icon: '📹', multiplier: 2.1 },
  { name: 'Decryption Keys', category: 'Intelligence', description: 'Code-breaking algorithms', icon: '🔑', multiplier: 2.3 },
  { name: 'Research Data', category: 'Intelligence', description: 'Scientific findings and analysis', icon: '📚', multiplier: 2.0 },
  
  // Luxury & Trade
  { name: 'Spice Essence', category: 'Luxury', description: 'Refined melange for consumption', icon: '✨', multiplier: 2.8 },
  { name: 'Fine Textiles', category: 'Luxury', description: 'High-quality fabrics', icon: '🎀', multiplier: 1.8 },
  { name: 'Artisan Goods', category: 'Luxury', description: 'Handcrafted items', icon: '🎨', multiplier: 1.7 },
  { name: 'Rare Metals', category: 'Luxury', description: 'Precious elements and alloys', icon: '💎', multiplier: 2.5 },
  { name: 'Trade Goods', category: 'Luxury', description: 'Various merchant commodities', icon: '📦', multiplier: 1.6 },
  { name: 'Cultural Artifacts', category: 'Luxury', description: 'Historical and religious items', icon: '🏺', multiplier: 2.0 },
  { name: 'Guild Banners', category: 'Luxury', description: 'Decorative faction symbols', icon: '🚩', multiplier: 1.5 },
]

/**
 * POST /api/guilds/initialize
 * Creates the 98 standard resources for a newly created guild
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guildId, guildTitle } = body

    if (!guildId) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    console.log(`[INIT] Creating standard resources for guild: ${guildTitle || guildId}`)

    const resourceData = STANDARD_RESOURCES.map(resource => ({
      id: nanoid(),
      guildId: guildId,
      name: resource.name,
      quantity: 0,
      description: resource.description,
      category: resource.category,
      icon: resource.icon,
      status: 'critical',
      targetQuantity: 1000,
      multiplier: resource.multiplier,
      lastUpdatedBy: 'System',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    // Insert all resources in batches of 25
    const batchSize = 25
    for (let i = 0; i < resourceData.length; i += batchSize) {
      const batch = resourceData.slice(i, i + batchSize)
      await db.insert(resources).values(batch)
    }

    console.log(`[INIT] Successfully created ${STANDARD_RESOURCES.length} resources for ${guildTitle || guildId}`)

    return NextResponse.json({
      success: true,
      resourcesCreated: STANDARD_RESOURCES.length,
      guildId: guildId
    })

  } catch (error) {
    console.error('[INIT] Error creating standard resources:', error)
    return NextResponse.json(
      { error: 'Failed to initialize guild resources' },
      { status: 500 }
    )
  }
}
