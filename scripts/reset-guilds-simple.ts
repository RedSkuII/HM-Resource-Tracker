/**
 * Simple Guild Reset Script
 * Calls the initialize API endpoint with reset=true
 */

import { db, resources, resourceHistory, leaderboard } from '../lib/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Import the same standard resources
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
  { name: 'Large Vehicle Fuel Cell', category: 'Refined Materials', description: 'A large vehicle fuel cell, refined in a chemical refinery. Can be attached to large vehicles in the vehicle bay to refuel them.', icon: '🔋', multiplier: 1.0 },
  { name: 'Light Caliber Compressor', category: 'Components', description: 'Light weapons that utilize gyrojet ammunition for their firing mechanism requires this key component. Their ubiquity makes them easy to find on Arrakis.', icon: '🔧', multiplier: 1.0 },
  { name: 'Low-grade Lubricant', category: 'Refined Materials', description: 'A maintenance compound needed for base Wind turbines to function. Can be refined in a Chemical Refinery.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Medium Sized Vehicle Fuel Cell', category: 'Refined Materials', description: 'A medium vehicle fuel cell, refined in a chemical refinery. Can be attached to medium sized vehicles in the vehicle bay to refuel them.', icon: '🔋', multiplier: 1.0 },
  { name: 'Micro-Sandwich Fabric', category: 'Components', description: 'A distillsuit crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🧵', multiplier: 1.0 },
  { name: 'Modified Respirator', category: 'Components', description: 'A stillsuit crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '😷', multiplier: 1.0 },
  { name: 'Overclocked Power Regulator', category: 'Components', description: 'A power crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '⚡', multiplier: 1.0 },
  { name: 'Particle Capacitor', category: 'Components', description: 'The Maas Kharet guard these parts jealously, likely collecting them from their many acts of piracy against the miners who would supply the Great Houses.', icon: '⚡', multiplier: 1.0 },
  { name: 'Plastanium Ingot', category: 'Refined Materials', description: 'A plastanium ingot, an incredibly versatile material. Refined from Duraluminum Ingots and Stravidium Fiber at a Large Ore Refinery. Used to create products that require Plastanium.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Plastanium Scraps', category: 'Components', description: 'A heavy armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Plasteel Plate', category: 'Components', description: 'An infiltration crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Plastone', category: 'Refined Materials', description: 'A stone substitute that can be refined in a Chemical Refinery. Can be used in most structures that require stone.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Precious Metals', category: 'Raw Materials', description: 'Small amounts of high-quality metals are needed for a wide variety of refined products on Arrakis.', icon: '🪙', multiplier: 1.0 },
  { name: 'Ray Amplifier', category: 'Components', description: 'While the Fremen have little use for blasters or similar ranged weapons, some few members have a peculiar interest in them and hoard away critical components for others to trade for.', icon: '⚡', multiplier: 1.0 },
  { name: 'Reactive Fabric', category: 'Components', description: 'A light armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🧵', multiplier: 1.0 },
  { name: 'Recycled Carbon', category: 'Raw Materials', description: 'A basic resource that can be obtained as a random by-product from processing Corpses into Water via a Deathstill.', icon: '♻️', multiplier: 1.0 },
  { name: 'Reinforced Barrels', category: 'Components', description: 'A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔫', multiplier: 1.0 },
  { name: 'Salt', category: 'Raw Materials', description: 'From stills to corpses, salt appears everywhere on Arrakis. It can be refined in a Chemical Refinery.', icon: '🧂', multiplier: 1.0 },
  { name: 'Silicone Block', category: 'Refined Materials', description: 'A Silicone block, refined from Flour Sand at a Chemical Refinery. Used to create products that require it.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Small Vehicle Fuel Cell', category: 'Refined Materials', description: 'A small vehicle fuel cell refined in a chemical refinery. Can be attached to small vehicles in the vehicle bay to refuel them.', icon: '🔋', multiplier: 1.0 },
  { name: 'Solaris', category: 'Refined Materials', description: 'Solaris is a type of currency (formerly known as Dinar) that has wide use on Arrakis. It is acquired through plundering, reputation rewards, and guild contracts among other means. Its primary use is spending in Deep Desert Merchants or on crafting from select blueprints.', icon: '💰', multiplier: 1.0 },
  { name: 'Spice', category: 'Raw Materials', description: 'The most valuable substance in the known universe, The Spice Melange. It is a geriatric spice which can extend life and expand consciousness. The Spice is found only in the most dangerous locations across Arrakis. Handle with care and fortune.', icon: '🌶️', multiplier: 1.0 },
  { name: 'Spice-infused Duraluminum Dust', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Spice-infused Fuel Cell', category: 'Refined Materials', description: 'Refined from Spice and Vehicle Fuel Cells in the Solarium. Can be attached to vehicles in the vehicle bay to refuel them with a higher quality fuel.', icon: '🔋', multiplier: 1.0 },
  { name: 'Spice-infused Plastanium Dust', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 },
  { name: 'Standard Filter', category: 'Refined Materials', description: 'The wind turbines upon which Arrakis depends for its power regularly require new filters. These are constructed from the parts used in stillsuits. Can be crafted in a Crafting Bench.', icon: '🌪️', multiplier: 1.0 },
  { name: 'Steel Ingot', category: 'Refined Materials', description: 'A Steel ingot, refined from Iron Ingots and Carbon Ore at any Ore Refinery. Used to create products that require Steel.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Stillsuit Parts', category: 'Components', description: 'Though almost everyone on Arrakis wears a stillsuit, few have the means or opportunity to create them for themselves. Most folk obtain these essential items of survival through more primitive methods.', icon: '💧', multiplier: 1.0 },
  { name: 'Stravidium Fiber', category: 'Refined Materials', description: 'A fiber obtained from stravidium plants in the Deep Desert. Used to create Plastanium Ingots at a Large Ore Refinery.', icon: '⚙️', multiplier: 1.0 },
  { name: 'Tactical Holtzman Actuator', category: 'Components', description: 'A movement crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '⚡', multiplier: 1.0 },
  { name: 'Thermoelectric Cooler', category: 'Components', description: 'A component used to craft vehicle engines. The Fremen occasionally scavenge these from vehicles those brave or foolish enough to venture into the deep desert.', icon: '❄️', multiplier: 1.0 },
  { name: 'Vehicle Fuel Cell', category: 'Refined Materials', description: 'A general Vehicle fuel cell refined in a chemical refinery. Can be attached to any size vehicle in the vehicle bay to refuel them.', icon: '🔋', multiplier: 1.0 },
  { name: 'Water', category: 'Raw Materials', description: 'The most precious substance on Arrakis. Needed for everything from survival to industry, a supply of water is needed to sustain any activity in the deep desert, no matter how brief.', icon: '💧', multiplier: 1.0 },
  { name: 'Wet Compacted Sand', category: 'Raw Materials', description: 'Used for making Plastone. Found in the East Flatlands. Not much else to say there.', icon: '⏳', multiplier: 1.0 },
  { name: 'Windtrap Parts', category: 'Components', description: 'While windtraps are more complex than a stillsuit, they still can be broken down into their constituent elements.', icon: '💨', multiplier: 1.0 },
  { name: 'Wood', category: 'Raw Materials', description: 'Wood, which in times past could be found simply lying around in sufficient quantity to construct a home, is exceedingly precious on Arrakis. Only the most stubborn and tenacious trees survive in Arrakis\' equatorial belt.', icon: '🪵', multiplier: 1.0 },
  { name: 'Worldsteel Parts', category: 'Components', description: 'A heavy armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0 }
]

async function resetGuilds() {
  const guildsToReset = ['house-melange', 'whitelist-second-guild']
  
  for (const guildId of guildsToReset) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Resetting guild: ${guildId}`)
    console.log('='.repeat(60))

    // Delete all resources
    const deletedResources = await db.delete(resources)
      .where(eq(resources.guildId, guildId))
      .returning()
    console.log(`✅ Deleted ${deletedResources.length} resources`)

    // Delete all history
    const deletedHistory = await db.delete(resourceHistory)
      .where(eq(resourceHistory.guildId, guildId))
      .returning()
    console.log(`✅ Deleted ${deletedHistory.length} history entries`)

    // Delete all leaderboard
    const deletedLeaderboard = await db.delete(leaderboard)
      .where(eq(leaderboard.guildId, guildId))
      .returning()
    console.log(`✅ Deleted ${deletedLeaderboard.length} leaderboard entries`)

    // Create fresh resources
    const resourceData = STANDARD_RESOURCES.map(resource => ({
      id: nanoid(),
      guildId: guildId,
      name: resource.name,
      quantity: 0,
      description: resource.description,
      category: resource.category,
      icon: resource.icon,
      status: 'critical',
      targetQuantity: 10000,
      multiplier: resource.multiplier,
      lastUpdatedBy: 'System',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const batchSize = 25
    for (let i = 0; i < resourceData.length; i += batchSize) {
      const batch = resourceData.slice(i, i + batchSize)
      await db.insert(resources).values(batch)
    }

    console.log(`✅ Created ${STANDARD_RESOURCES.length} fresh resources`)
  }

  console.log('\n✅ Reset complete! Both guilds now have clean 95 default resources.')
}

resetGuilds().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
