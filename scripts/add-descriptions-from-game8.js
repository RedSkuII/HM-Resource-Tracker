#!/usr/bin/env node

/**
 * Add descriptions to resources from Game8 wiki
 * Extracts descriptions from the resource table on Game8
 */

require('dotenv').config({ path: '.env.production' })
const { createClient } = require('@libsql/client')

// Descriptions extracted from Game8 wiki table
const resourceDescriptions = {
  "Advanced Machinery": "A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Advanced Particulate Filter": "An advanced filter for catching any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in an Advanced Survival Fabricator.",
  "Advanced Servoks": "A fabrication component used in vehicles such as Sandbikes. Found in Old Imperial remnants, such as Imperial Testing Stations.",
  "Agave Seeds": "In common with its distant ancestors, the fruits of the Arrakeen Agave contain a large mass of seeds, which are put to many uses by those who have ready access to them.",
  "Aluminum Ingot": "An Aluminum ingot, refined from Aluminum Ore at a Medium Ore Refinery. Used to create products that require Aluminum. Can also be further processed into Duraluminum with Jasmium Crystals.",
  "Aluminum Ore": "Aluminum ore, mined from an Aluminum deposit. Can be refined into Aluminum Ingots at a Medium Ore Refinery to create new products that require it.",
  "Armor Plating": "Strengthened Plating can be liberated from those who make use of them in their heavy armor, and repurposed to other ends.",
  "Atmospheric Filtered Fabric": "A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Ballistic Weave Fabric": "A light armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.",
  "Basalt Stone": "Stone which can be refined for usage in construction.",
  "Blade Parts": "Even the wide variety of melee weapons tend to use standardized parts for their handful of complex elements. These can often be found on the bodies of those who favor the blade, or in their storage lockers.",
  "Calibrated Servok": "These specialist servoks are commonly repurposed from heavy-duty equipment. This type of equipment was used extensively in Jabal Eifrit.",
  "Carbide Blade Parts": "A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.",
  "Carbide Scraps": "This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why.",
  "Carbon Ore": "Carbon ore, mined from a Carbon deposit. Can be processed with Iron Ingots together to create refined Steel Ingots at any Ore Refinery to create new products that require it.",
  "Cobalt Paste": "A dissolution of Cobalt, refined from Erythrite Crystal from the Hagga Rift at a Chemical Refinery. Used to create products that require Cobalt.",
  "Complex Machinery": "Ironically, these components are found in many older fabricators and refineries, but cannot themselves be easily replicated.",
  "Copper Ingot": "A Copper ingot, refined from Copper Ore at any Ore Refinery. Used to create products that require Copper.",
  "Copper Ore": "Copper ore, mined from a Copper deposit. Can be refined into Copper Ingots at any Ore Refinery to create new products that require it.",
  "Corpse": "Dead body that can be processed into water using a Deathstill.",
  "Diamodine Blade Parts": "A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Diamondine Dust": "This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why.",
  "Duraluminum Ingot": "A Duraluminum ingot, refined from Aluminum Ingots and Jasmium Crystals at a Medium Ore Refinery. Used to create products that require Duraluminum.",
  "EMF Generator": "A fabrication component found in Fremen areas, such as caves. Used in Cutterays.",
  "Erythrite Crystal": "Erythrite Crystal, mined from an Erythrite deposit in the Hagga Rift. Can be refined into Cobalt Paste at a Chemical Refinery to create new products that require it.",
  "Flour Sand": "Found in flour sand drifts on the open sands, predominantly in the Vermilius Gap. Can be harvested by hand or with a Static Compactor. Can be refined into Silicone Blocks in a Chemical Refinery.",
  "Fluid Efficient Industrial Pump": "A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Fluted Heavy Caliber Compressor": "A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Fluted Light Caliber Compressor": "A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Fuel Cell": "Found throughout the world, fuel cells can generate power for bases directly when loaded into a Fuel Generator. They can be refined at a Chemical Refinery into Vehicle Fuel Cells to power vehicles.",
  "Granite Stone": "Stronger than the sandstones that crumble in the storms that sweep across Arrakis, granite stone is widely used as a basic building material. It is found almost everywhere there is dirt.",
  "Gun Parts": "Key components for a wide variety of standard ranged weapons, often salvaged from the bodies of those who no longer have need for them.",
  "Heavy Caliber Compressor": "The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes.",
  "Holtzman Actuator": "Those who make regular use of suspensor belts and similar technology often leave caches of these replacement parts in places only they can reach.",
  "Hydraulic Piston": "A component used to craft vehicle engines. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrested them from their control.",
  "Improved Holtzman Actuator": "A Traversal crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Improved Watertube": "A stillsuit crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.",
  "Industrial Pump": "There are few uses for industrial-strength pumps on a planet as dry as Arrakis, but the Sandflies do utilize them in their operations in Sentinel City.",
  "Industrial-grade Lubricant": "An industrial quality lubricant required for directional wind turbines to function. Can be refined in a chemical refinery.",
  "Insulated Fabric": "Insulated fabric was one of the cottage industries of the O'odham, before the pyons were displaced from their old villages.",
  "Iron Ingot": "An Iron Ingot, refined from Iron Ore at any Ore refinery. Used to create products that require Iron. Can also be further processed into Steel with Carbon Ore.",
  "Iron Ore": "Iron ore, mined from an Iron deposit. Can be refined into Iron Ingots at any Ore Refinery to create new products that require it.",
  "Irradiated Core": "A power crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Irradiated Slag": "A looted component used in crafting. Found in Radiated Core in the Sheol.",
  "Jasmium Crystal": "Jasmium Crystal, mined from a Jasmium deposit. Can be refined together with Aluminum Ingots into Duraluminum Ingots at a Medium Ore Refinery to create new products that require it.",
  "Large Vehicle Fuel": "Vehicle Fuel Cell with high capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.",
  "Light Caliber Compressor": "The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes.",
  "Low-grade Lubricant": "A low-grade lubricant required for omnidirectional wind turbines to function. Can be refined in a chemical refinery.",
  "Makeshift Filter": "A filter with simple functionality to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator.",
  "Mechanical Parts": "A fabrication component used in firearms. Found in Great House ruins, such as Shipwrecks.",
  "Medium Sized Vehicle Fuel Cell": "Vehicle Fuel Cell with average capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.",
  "Micro-sandwich Fabric": "The Micro-Sandwich Fabric is a shorthand for the multi-layered water recycling component used in Fremen equipment such as stillsuits. Look for these in caves.",
  "Military Power Regulator": "A component used to craft vehicle power units. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrestled them from their control.",
  "Mouse Corpse": "A dead Muad'dib. Can be consumed to drink some blood as a last resort.",
  "Off-world Medical Supplies": "Fremen medical tradition relies on only what the desert provides. Everyone else uses off-world pharmaceuticals, if they can get them.",
  "Opafire Gem": "One of the rare opaline jewels of Hagal. They shimmer with a captivating blend of fiery reds and cool iridescent hues.",
  "Overclocked Power Regulator": "A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Particle Capacitor": "A fabrication component found in Old Imperial remnants, such as Imperial Testing Stations. Used in Holtzman tech or special constructions such as Boost modules for vehicles.",
  "Particulate Filter": "A thorough filter to catch any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in a Survival Fabricator.",
  "Plant Fiber": "Resource that can be picked everywhere in the world where there is solid land for it to take root. Woven to fibers used in armor and in bandages.",
  "Plastanium Ingot": "Pure titanium is extracted from its ore, heated until liquid, and then carefully threaded with stravidium fibers to enhance its strength.",
  "Plasteel Composite Armor Plating": "An Armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Plasteel Composite Blade Parts": "A Melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Plasteel Composite Gun Parts": "A Ranged Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Plasteel Microflora Fiber": "A fabrication component used in armor. Found in Great House ruins, such as Shipwrecks.",
  "Plasteel Plate": "A crafting component for crafting plasteel crafting components. Can be found in the Deep Desert, or obtained from Landsraad rewards.",
  "Plastone": "An artificial composite of Silicone and Basalt used in sandstorm-resistant construction.",
  "Precision Range Finder": "A Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Range Finder": "Unsurprisingly, if you want to acquire a range-finder, look for sharpshooters. But remember, if you can see them, they can probably see you.",
  "Ray Amplifier": "Industrial production of bulk ores still commonly relies on drilling, but for mining more delicate materials such as crystals, a sophisticated cutteray is worth the investment. This type of equipment was used extensively to mine large parts of the Hagga Rift.",
  "Salvaged Metal": "This metal has been salvaged from wreckage left on Arrakis. Can be recovered with a Cutteray. Used for crafting rudimentary metal items.",
  "Sandtrout Leathers": "The Maas Kharet have a particular affinity with this type of leather, and often make use of it in their clothing.",
  "Ship Manifest": "Detailed records of cargo, crew, and routes. Useful for monitoring covert trade routes and spice shipments.",
  "Silicone Block": "A block of plastic refined from Flour Sand in a Chemical Refinery. Can be used to create new products that require it.",
  "Small Vehicle Fuel Cell": "Vehicle Fuel Cell with low capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.",
  "Solari": "Solaris are the currency of the Imperium. Use it to buy goods from vendors. Upon defeat you drop your Solaris, so be sure to visit a banker in villages to deposit them for safekeeping.",
  "Spice Melange": "Made from Spice Sand at a Spice Refinery. The most sought-after resource in the universe. Enables intergalactic travel and extends life. Addictive. Withdrawal leads to death.",
  "Spice Residue": "Residue left from spice refining useful in crafting.",
  "Spice Sand": "Can be harvested by hand or with a Static Compactor at Spice Blow sites before the Worm arrives. Can be refined into valuable Spice Melange at a Spice Refinery.",
  "Spice-infused Aluminum Dust": "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.",
  "Spice-infused Copper Dust": "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.",
  "Spice-infused Duraluminum Dust": "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.",
  "Spice-infused Fuel Cell": "A fuel cell for spice-powered generators. Made from fuel cells and spice residue. Can be refined in a Medium Chemical Refinery.",
  "Spice-Infused Iron Dust": "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.",
  "Spice-infused Plastanium Dust": "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.",
  "Spice-Infused Steel Dust": "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.",
  "Standard Filter": "A CHOAM-patented filter with improved protection against the harsh winds of Arakkis. Needed to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator.",
  "Steel Ingot": "A Steel ingot refined from Carbon Ore and Iron Ingot at any Ore Refinery. Used to create products that require Steel.",
  "Stillsuit Tubing": "The best tubing of course comes from the Fremen, but they do not share. The Maas Kharet are seen by many as a cheap imitation of the Fremen, and they produce a cheap imitation of Fremen stillsuit tubing.",
  "Stravidium Fiber": "These fibers are carefully drawn from a chemically-treated stravidium mass, and used in the production of plastanium.",
  "Stravidium Mass": "Raw stravidium mass can be found in the deep desert, and refined into fibers.",
  "Thermo-Responsive Ray Amplifier": "A Utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Thermoelectric Cooler": "A crafting component used to cool down Harvesting tools used in the Deep Desert. Spare parts are usually found in the Deep Desert on the Shield Wall.",
  "Titanium Ore": "Titanium ore is found in the deep desert, and most commonly utilized in the production of plastanium, an alloy of titanium and stravidium.",
  "Tri-Forged Hydraulic Piston": "A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.",
  "Water": "Water is a resource used by Fabricators and Refineries.",
  "Worm Tooth": "A crafting component obtained from dying to the sandworm. Can be used to craft an unfixed crysknife."
}

async function addDescriptions() {
  console.log('📝 Adding descriptions to resources from Game8 wiki...\n')
  
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
    let updated = 0
    let notFound = 0
    let alreadyHad = 0
    const notFoundList = []
    
    console.log(`🔄 Processing ${Object.keys(resourceDescriptions).length} resource descriptions...\n`)
    
    for (const [name, description] of Object.entries(resourceDescriptions)) {
      // Check if resource exists
      const existing = await client.execute({
        sql: 'SELECT id, description FROM resources WHERE name = ?',
        args: [name]
      })
      
      if (existing.rows.length === 0) {
        console.log(`⚠️  Not found in DB: ${name}`)
        notFound++
        notFoundList.push(name)
        continue
      }
      
      // Check if it already has a description
      if (existing.rows[0].description) {
        console.log(`ℹ️  Already has description: ${name}`)
        alreadyHad++
        continue
      }
      
      // Update description
      await client.execute({
        sql: 'UPDATE resources SET description = ? WHERE name = ?',
        args: [description, name]
      })
      
      console.log(`✅ Added description: ${name}`)
      updated++
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('📊 UPDATE SUMMARY:')
    console.log('='.repeat(70))
    console.log(`  ✅ Descriptions added: ${updated} resources`)
    console.log(`  ℹ️  Already had descriptions: ${alreadyHad} resources`)
    console.log(`  ⚠️  Not found in database: ${notFound} resources`)
    
    if (notFoundList.length > 0) {
      console.log('\n  📝 Resources not in your database:')
      notFoundList.forEach(name => console.log(`     - ${name}`))
    }
    
    console.log('='.repeat(70))
    console.log('\n🎉 Description update complete!')
    console.log('💡 Descriptions will now display on your website for each resource.')
    
  } catch (error) {
    console.error('❌ Update failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

addDescriptions()
