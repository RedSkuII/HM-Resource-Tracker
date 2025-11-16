import { NextRequest, NextResponse } from 'next/server'
import { db, resources, resourceHistory, leaderboard, discordOrders, resourceDiscordMapping, websiteChanges, botActivityLogs } from '@/lib/db'
import { eq, inArray, isNotNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Standard 95 resources template (Dune: Awakening)
const STANDARD_RESOURCES = [
  { name: 'Advanced Machinery', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Advanced Particulate Filter', category: 'Refined Materials', description: 'An advanced filter for catching any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in an Advanced Survival Fabricator.', icon: '🌪️', multiplier: 1.0 },
  { name: 'Advanced Servoks', category: 'Components', description: 'A fabrication component used in vehicles such as Sandbikes. Found in Old Imperial remnants, such as Imperial Testing Stations.', icon: '🔧', multiplier: 1.0 },
  { name: 'Agave Seeds', category: 'Raw Materials', description: 'In common with its distant ancestors, the fruits of the Arrakeen Agave contain a large mass of seeds, which are put to many uses by those who have ready access to them.', icon: '🌱', multiplier: 1.0 },
  { name: 'Aluminum Ingot', category: 'Refined Materials', description: 'An Aluminum ingot, refined from Aluminum Ore at a Medium Ore Refinery. Used to create products that require Aluminum. Can also be further processed into Duraluminum with Jasmium Crystals.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Aluminum Ore', category: 'Raw Materials', description: 'Aluminum ore, mined from an Aluminum deposit. Can be refined into Aluminum Ingots at a Medium Ore Refinery to create new products that require it.', icon: '⛏️', multiplier: 1.0 },
  { name: 'Armor Plating', category: 'Components', description: 'Strengthened Plating can be liberated from those who make use of them in their heavy armor, and repurposed to other ends.', icon: '🛡️', multiplier: 1.0 },
  { name: 'Atmospheric Filtered Fabric', category: 'Components', description: 'A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🧵', multiplier: 1.0 },
  { name: 'Ballistic Weave Fabric', category: 'Components', description: 'A light armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.', icon: '🧵', multiplier: 1.0 },
  { name: 'Basalt Stone', category: 'Raw Materials', description: 'Stone which can be refined for usage in construction.', icon: '🪨', multiplier: 1.0 },
  { name: 'Blade Parts', category: 'Components', description: 'Even the wide variety of melee weapons tend to use standardized parts for their handful of complex elements. These can often be found on the bodies of those who favor the blade, or in their storage lockers', icon: '🗡️', multiplier: 1.0 },
  { name: 'Calibrated Servok', category: 'Components', description: 'These specialist servoks are commonly repurposed from heavy-duty equipment. This type of equipment was used extensively in Jabal Eifrit.', icon: '🔧', multiplier: 1.0 },
  { name: 'Carbide Blade Parts', category: 'Components', description: 'A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.', icon: '🗡️', multiplier: 1.0 },
  { name: 'Carbide Scraps', category: 'Components', description: 'This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why.', icon: '🔧', multiplier: 1.0 },
  { name: 'Carbon Ore', category: 'Raw Materials', description: 'Carbon ore, mined from a Carbon deposit. Can be processed with Iron Ingots together to create refined Steel Ingots at any Ore Refinery to create new products that require it.', icon: '⛏️', multiplier: 1.0 },
  { name: 'Cobalt Paste', category: 'Refined Materials', description: 'A dissolution of Cobalt, refined from Erythrite Crystal from the Hagga Rift at a Chemical Refinery. Used to create products that require Cobalt.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Complex Machinery', category: 'Components', description: 'Ironically, these components are found in many older fabricators and refineries, but cannot themselves be easily replicated.', icon: '🔧', multiplier: 1.0 },
  { name: 'Copper Ingot', category: 'Refined Materials', description: 'A Copper ingot. refined from Copper Ore at any Ore Refinery. Used to create products that require Copper.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Copper Ore', category: 'Raw Materials', description: 'Copper ore, mined from a Copper deposit. Can be refined into Copper Ingots at any Ore Refinery to create new products that require it.', icon: '⛏️', multiplier: 1.0 },
  { name: 'Corpse', category: 'Raw Materials', description: 'Dead body that can be processed into water using a Deathstill.', icon: '💀', multiplier: 1.0 },
  { name: 'Diamodine Blade Parts', category: 'Components', description: 'A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🗡️', multiplier: 1.0 },
  { name: 'Diamondine Dust', category: 'Components', description: 'This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why.', icon: '🔧', multiplier: 1.0 },
  { name: 'Duraluminum Ingot', category: 'Refined Materials', description: 'A Duraluminum ingot, refined from Aluminum Ingots and Jasmium Crystals at a Medium Ore Refinery. Used to create products that require Duraluminum.', icon: '⚙️', multiplier: 1.0 },
  { name: 'EMF Generator', category: 'Components', description: 'A fabrication component found in Fremen areas, such as caves. Used in Cutterays.', icon: '⚡', multiplier: 1.0 },
  { name: 'Erythrite Crystal', category: 'Raw Materials', description: 'Erythrite Crystal, mined from an Erythrite deposit in the Hagga Rift. Can be refined into Cobalt Paste at a Chemical Refinery to create new products that require it.', icon: '💎', multiplier: 1.0 },
  { name: 'Flour Sand', category: 'Raw Materials', description: 'Found in flour sand drifts on the open sands. predominantly in the Vermilius Gap. Can be harvested by hand or with a Static Compactor. Can be refined into Silicone Blocks in a Chemical Refinery.', icon: '⏳', multiplier: 1.0 },
  { name: 'Fluid Efficient Industrial Pump', category: 'Components', description: 'A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🚰', multiplier: 1.0 },
  { name: 'Fluted Heavy Caliber Compressor', category: 'Components', description: 'A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Fluted Light Caliber Compressor', category: 'Components', description: 'A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Fuel Cell', category: 'Raw Materials', description: 'Found throughout the world, fuel cells can generate power for bases directly when loaded into a Fuel Generator. They can be refined at a Chemical Refinery into Vehicle Fuel Cells to power vehicles.', icon: '🔋', multiplier: 1.0 },
  { name: 'Granite Stone', category: 'Raw Materials', description: 'Stronger than the sandstones that crumble in the storms that sweep across Arrakis, granite stone is widely used as a basic building material. It is found almost everywhere there is dirt.', icon: '🪨', multiplier: 1.0 },
  { name: 'Gun Parts', category: 'Components', description: 'Key components for a wide variety of standard ranged weapons, often salvaged from the bodies of those who no longer have need for them.', icon: '🔫', multiplier: 1.0 },
  { name: 'Heavy Caliber Compressor', category: 'Components', description: 'The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes.', icon: '🔧', multiplier: 1.0 },
  { name: 'Holtzman Actuator', category: 'Components', description: 'Those who make regular use of suspensor belts and similar technology often leave caches of these replacement parts in places only they can reach.', icon: '⚡', multiplier: 1.0 },
  { name: 'Hydraulic Piston', category: 'Components', description: 'A component used to craft vehicle engines. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrested them from their control.', icon: '🚜', multiplier: 1.0 },
  { name: 'Improved Holtzman Actuator', category: 'Components', description: 'A Traversal crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '⚡', multiplier: 1.0 },
  { name: 'Improved Watertube', category: 'Components', description: 'A stillsuit crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Industrial Pump', category: 'Components', description: 'There are few uses for industrial-strength pumps on a planet as dry as Arrakis, but the Sandflies do utilize them in their operations in Sentinel City.', icon: '🚰', multiplier: 1.0 },
  { name: 'Industrial-grade Lubricant', category: 'Refined Materials', description: 'An industrial quality lubricant required for directional wind turbines to function. Can be refined in a chemical refinery.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Insulated Fabric', category: 'Components', description: 'Insulated fabric was one of the cottage industries of the O\'odham, before the pyons were displaced from their old villages.', icon: '🧵', multiplier: 1.0 },
  { name: 'Iron Ingot', category: 'Refined Materials', description: 'An Iron Ingot, refined from Iron Ore at any Ore refinery. Used to create products that require Iron. Can also be further processed into Steel with Carbon Ore.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Iron Ore', category: 'Raw Materials', description: 'Iron ore, mined from an Iron deposit. Can be refined into Iron Ingots at any Ore Refinery to create new products that require it.', icon: '⛏️', multiplier: 1.0 },
  { name: 'Irradiated Core', category: 'Components', description: 'A power crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '⚡', multiplier: 1.0 },
  { name: 'Irradiated Slag', category: 'Components', description: 'A looted component used in crafting. Found in Radiated Core in the Sheol.', icon: '🔧', multiplier: 1.0 },
  { name: 'Jasmium Crystal', category: 'Raw Materials', description: 'Jasmium Crystal, mined from a Jasmium deposit. Can be refined together with Aluminum Ingots into Duraluminum Ingots at a Medium Ore Refinery to create new products that require it.', icon: '💎', multiplier: 1.0 },
  { name: 'Large Vehicle Fuel', category: 'Refined Materials', description: 'Vehicle Fuel Cell with high capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.', icon: '🔋', multiplier: 1.0 },
  { name: 'Light Caliber Compressor', category: 'Components', description: 'The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes.', icon: '🔧', multiplier: 1.0 },
  { name: 'Low-grade Lubricant', category: 'Refined Materials', description: 'A low-grade lubricant required for omnidirectional wind turbines to function. Can be refined in a chemical refinery.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Makeshift Filter', category: 'Refined Materials', description: 'A filter with simple functionality to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator.', icon: '🌪️', multiplier: 1.0 },
  { name: 'Mechanical Parts', category: 'Components', description: 'A fabrication component used in firearms. Found in Great House ruins, such as Shipwrecks.', icon: '🔧', multiplier: 1.0 },
  { name: 'Medium Sized Vehicle Fuel Cell', category: 'Refined Materials', description: 'Vehicle Fuel Cell with average capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.', icon: '🔋', multiplier: 1.0 },
  { name: 'Micro-sandwich Fabric', category: 'Components', description: 'The Micro-Sandwich Fabric is a shorthand for the multi-layered water recycling component used in Fremen equipment such as stillsuits. Look for these in caves.', icon: '🧵', multiplier: 1.0 },
  { name: 'Military Power Regulator', category: 'Components', description: 'A component used to craft vehicle power units. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrestled them from their control.', icon: '🔌', multiplier: 1.0 },
  { name: 'Mouse Corpse', category: 'Raw Materials', description: 'A dead Muad\'dib. Can be consumed to drink some blood as a last resort.', icon: '💀', multiplier: 1.0 },
  { name: 'Off-world Medical Supplies', category: 'Components', description: 'Fremen medical tradition relies on only what the desert provides. Everyone else uses off-world pharmaceuticals, if they can get them.', icon: '💊', multiplier: 1.0 },
  { name: 'Opafire Gem', category: 'Components', description: 'One of the rare opaline jewels of Hagal. They shimmer with a captivating blend of fiery reds and cool iridescent hues.', icon: '💠', multiplier: 1.0 },
  { name: 'Overclocked Power Regulator', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔌', multiplier: 1.0 },
  { name: 'Particle Capacitor', category: 'Components', description: 'A fabrication component found in Old Imperial remnants, such as Imperial Testing Stations. Used in Holtzman tech or special constructions such as Boost modules for vehicles.', icon: '🔌', multiplier: 1.0 },
  { name: 'Particulate Filter', category: 'Refined Materials', description: 'A thorough filter to catch any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in a Survival Fabricator.', icon: '🌪️', multiplier: 1.0 },
  { name: 'Plant Fiber', category: 'Raw Materials', description: 'Resource that can be picked everywhere in the world where there is solid land for it to take root. Woven to fibers used in armor and in bandages.', icon: '🌿', multiplier: 1.0 },
  { name: 'Plastanium Ingot', category: 'Refined Materials', description: 'Pure titanium is extracted from its ore, heated until liquid, and then carefully threaded with stravidium fibers to enhance its strength.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Plasteel Composite Armor Plating', category: 'Components', description: 'An Armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔩', multiplier: 1.0 },
  { name: 'Plasteel Composite Blade Parts', category: 'Components', description: 'A Melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔩', multiplier: 1.0 },
  { name: 'Plasteel Composite Gun Parts', category: 'Components', description: 'A Ranged Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Ladsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔩', multiplier: 1.0 },
  { name: 'Plasteel Microflora Fiber', category: 'Components', description: 'A fabrication component used in armor. Found in Great House ruins, such as Shipwrecks.', icon: '🔩', multiplier: 1.0 },
  { name: 'Plasteel Plate', category: 'Components', description: 'A crafting component for crafting plasteel crafting components. Can be found in the Deep Desert, or obtained from Landsraad rewards.', icon: '🔩', multiplier: 1.0 },
  { name: 'Plastone', category: 'Refined Materials', description: 'An artificial composite of Silicone and Basalt used in sandstorm-resistant construction.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Precision Range Finder', category: 'Components', description: 'A Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Range Finder', category: 'Components', description: 'Unsurprisingly, if you want to acquire a range-finder, look for sharpshooters. But remember, if you can see them, they can probably see you.', icon: '🔧', multiplier: 1.0 },
  { name: 'Ray Amplifier', category: 'Components', description: 'Industrial production of bulk ores still commonly relies on drilling, but for mining more delicate materials such as crystals, a sophisticated cutteray is worth the investment. This type of equipment was used extensively to mine large parts of the Hagga Rift.', icon: '🔧', multiplier: 1.0 },
  { name: 'Salvaged Metal', category: 'Raw Materials', description: 'This metal has been salvaged from wreckage left on Arrakis. Can be recovered with a Cutteray. Used for crafting rudimentary metal items.', icon: '🔨', multiplier: 1.0 },
  { name: 'Sandtrout Leathers', category: 'Components', description: 'The Maas Kharet have a particular affinity with this type of leather, and often make use of it in their clothing.', icon: '🧥', multiplier: 1.0 },
  { name: 'Ship Manifest', category: 'Components', description: 'Detailed records of cargo, crew, and routes. Useful for monitoring covert trade routes and spice shipments.', icon: '📋', multiplier: 1.0 },
  { name: 'Silicone Block', category: 'Refined Materials', description: 'A block of plastic refined from Flour Sand in a Chemical Refinery. Can be used to create new products that require it.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Small Vehicle Fuel Cell', category: 'Refined Materials', description: 'Vehicle Fuel Cell with low capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.', icon: '🔋', multiplier: 1.0 },
  { name: 'Solari', category: 'Currency', description: 'Solaris are the currency of the Imperium. Use it to buy goods from vendors. Upon defeat you drop your Solaris, so be sure to visit a banker in villages to deposit them for safekeeping.', icon: '💰', multiplier: 1.0 },
  { name: 'Spice Melange', category: 'Refined Materials', description: 'Made from Spice Sand at a Spice Refinery. The most sought-after resource in the universe. Enables intergalactic travel and extends life. Addictive. Withdrawal leads to death.', icon: '🌟', multiplier: 1.0 },
  { name: 'Spice Residue', category: 'Raw Materials', description: 'Residue left from spice refining useful in crafting.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice Sand', category: 'Raw Materials', description: 'Can be harvested by hand or with a Static Compactor at Spice Blow sites before the Worm arrives. Can be refined into valuable Spice Melange at a Spice Refinery.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-infused Aluminum Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-infused Copper Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-infused Duraluminum Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-infused Fuel Cell', category: 'Refined Materials', description: 'A fuel cell for spice-powered generators. Made from fuel cells and spice residue. Can be refined in a Medium Chemical Refinery.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-Infused Iron Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-infused Plastanium Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', multiplier: 1.0 },
  { name: 'Spice-Infused Steel Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', multiplier: 1.0 },
  { name: 'Standard Filter', category: 'Refined Materials', description: 'A CHOAM-patented filter with improved protection against the harsh winds of Arakkis. Needed to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator.', icon: '🌪️', multiplier: 1.0 },
  { name: 'Steel Ingot', category: 'Refined Materials', description: 'A Steel ingot refined from Carbon Ore and Iron Ingot at any Ore Refinery. Used to create products that require Steel.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Stillsuit Tubing', category: 'Components', description: 'The best tubing of course comes from the Fremen, but they do not share. The Maas Kharet are seen by many as a cheap imitation of the Fremen, and they produce a cheapimitation of Fremen stillsuit tubing.', icon: '🔧', multiplier: 1.0 },
  { name: 'Stravidium Fiber', category: 'Refined Materials', description: 'These fibers are carefully drawn from a chemically-treated stravidium mass, and used in the production of plastanium.', icon: '🧵', multiplier: 1.0 },
  { name: 'Stravidium Mass', category: 'Raw Materials', description: 'Raw stravidium mass can be found in the deep desert, and refined into fibers.', icon: '📦', multiplier: 1.0 },
  { name: 'Thermo-Responsive Ray Amplifier', category: 'Components', description: 'A Utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Thermoelectric Cooler', category: 'Components', description: 'A crafting component used to cool down Harvesting tools used in the Deep Desert. Spare parts are usually found in the Deep Desert on the Shield Wall.', icon: '🔧', multiplier: 1.0 },
  { name: 'Titanium Ore', category: 'Raw Materials', description: 'Titanium ore is found in the deep desert, and most commonly utilized in the production of plastanium, an alloy of titanium and stravidium.', icon: '⛏️', multiplier: 1.0 },
  { name: 'Tri-Forged Hydraulic Piston', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
]

/**
 * POST /api/guilds/initialize
 * Creates the 95 standard resources for a newly created guild
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guildId, guildTitle, reset = false } = body

    if (!guildId) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // If reset=true, delete all existing data for this guild first
    if (reset) {
      console.log(`[INIT] RESET MODE: Deleting all existing data for guild: ${guildTitle || guildId}`)
      
      // First, get all resource IDs for this guild (needed for tables without guildId)
      const guildResources = await db.select({ id: resources.id })
        .from(resources)
        .where(eq(resources.guildId, guildId))
      const resourceIds = guildResources.map(r => r.id)
      console.log(`[INIT] Found ${resourceIds.length} resources to delete`)
      
      // Delete website changes that reference these resources (no guildId field)
      if (resourceIds.length > 0) {
        try {
          const deletedChanges = await db.delete(websiteChanges)
            .where(inArray(websiteChanges.resourceId, resourceIds))
            .returning()
          console.log(`[INIT] Deleted ${deletedChanges.length} website changes`)
        } catch (error) {
          console.error('[INIT] Error deleting website changes:', error)
          throw new Error(`Failed to delete website changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        try {
          // Delete bot activity logs that reference these resources
          const deletedLogs = await db.delete(botActivityLogs)
            .where(inArray(botActivityLogs.resourceId, resourceIds))
            .returning()
          console.log(`[INIT] Deleted ${deletedLogs.length} bot activity logs`)
        } catch (error) {
          console.error('[INIT] Error deleting bot activity logs:', error)
          throw new Error(`Failed to delete bot activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      try {
        // Delete resource history FIRST (has foreign key to resources)
        const deletedHistory = await db.delete(resourceHistory)
          .where(eq(resourceHistory.guildId, guildId))
          .returning()
        console.log(`[INIT] Deleted ${deletedHistory.length} history entries`)
      } catch (error) {
        console.error('[INIT] Error deleting resource history:', error)
        throw new Error(`Failed to delete resource history: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      try {
        // Delete leaderboard entries (has foreign key to resources)
        const deletedLeaderboard = await db.delete(leaderboard)
          .where(eq(leaderboard.guildId, guildId))
          .returning()
        console.log(`[INIT] Deleted ${deletedLeaderboard.length} leaderboard entries`)
      } catch (error) {
        console.error('[INIT] Error deleting leaderboard:', error)
        throw new Error(`Failed to delete leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      try {
        // Delete Discord orders (has foreign key to resources)
        const deletedOrders = await db.delete(discordOrders)
          .where(eq(discordOrders.guildId, guildId))
          .returning()
        console.log(`[INIT] Deleted ${deletedOrders.length} Discord orders`)
      } catch (error) {
        console.error('[INIT] Error deleting Discord orders:', error)
        throw new Error(`Failed to delete Discord orders: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      try {
        // Delete resource Discord mapping (has foreign key to resources)
        const deletedMappings = await db.delete(resourceDiscordMapping)
          .where(eq(resourceDiscordMapping.guildId, guildId))
          .returning()
        console.log(`[INIT] Deleted ${deletedMappings.length} Discord resource mappings`)
      } catch (error) {
        console.error('[INIT] Error deleting Discord mappings:', error)
        throw new Error(`Failed to delete Discord mappings: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      try {
        // Delete resources LAST (parent table)
        const deletedResources = await db.delete(resources)
          .where(eq(resources.guildId, guildId))
          .returning()
        console.log(`[INIT] Deleted ${deletedResources.length} existing resources`)
      } catch (error) {
        console.error('[INIT] Error deleting resources:', error)
        throw new Error(`Failed to delete resources: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('[INIT] Error details:', errorMessage, errorStack)
    return NextResponse.json(
      { 
        error: 'Failed to initialize guild resources',
        details: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    )
  }
}
