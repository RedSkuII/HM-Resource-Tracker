/**
 * Reset Production Database with User's Original Resources
 * Uses the exact resources provided by the user with descriptions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const { nanoid } = require('nanoid');

const DISCORD_GUILD_ID = '1261674004780027904';

// User's original resources with descriptions
const USER_RESOURCES = [
  { name: "Advanced Machinery", category: "Advanced Tech", description: "A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Advanced Particulate Filter", category: "Refined Materials", description: "An advanced filter for catching any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in an Advanced Survival Fabricator." },
  { name: "Advanced Servoks", category: "Advanced Tech", description: "A fabrication component used in vehicles such as Sandbikes. Found in Old Imperial remnants, such as Imperial Testing Stations." },
  { name: "Agave Seeds", category: "Raw Materials", description: "In common with its distant ancestors, the fruits of the Arrakeen Agave contain a large mass of seeds, which are put to many uses by those who have ready access to them." },
  { name: "Aluminum Ingot", category: "Refined Materials", description: "An Aluminum ingot, refined from Aluminum Ore at a Medium Ore Refinery. Used to create products that require Aluminum. Can also be further processed into Duraluminum with Jasmium Crystals." },
  { name: "Aluminum Ore", category: "Raw Materials", description: "Aluminum ore, mined from an Aluminum deposit. Can be refined into Aluminum Ingots at a Medium Ore Refinery to create new products that require it." },
  { name: "Armor Plating", category: "Armor", description: "Strengthened Plating can be liberated from those who make use of them in their heavy armor, and repurposed to other ends." },
  { name: "Atmospheric Filtered Fabric", category: "Advanced Tech", description: "A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Ballistic Weave Fabric", category: "Armor", description: "A light armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator." },
  { name: "Basalt Stone", category: "Raw Materials", description: "Stone which can be refined for usage in construction." },
  { name: "Blade Parts", category: "Weapons", description: "Even the wide variety of melee weapons tend to use standardized parts for their handful of complex elements. These can often be found on the bodies of those who favor the blade, or in their storage lockers" },
  { name: "Calibrated Servok", category: "Advanced Tech", description: "These specialist servoks are commonly repurposed from heavy-duty equipment. This type of equipment was used extensively in Jabal Eifrit." },
  { name: "Carbide Blade Parts", category: "Weapons", description: "A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator." },
  { name: "Carbide Scraps", category: "Raw Materials", description: "This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why." },
  { name: "Carbon Ore", category: "Raw Materials", description: "Carbon ore, mined from a Carbon deposit. Can be processed with Iron Ingots together to create refined Steel Ingots at any Ore Refinery to create new products that require it." },
  { name: "Cobalt Paste", category: "Refined Materials", description: "A dissolution of Cobalt, refined from Erythrite Crystal from the Hagga Rift at a Chemical Refinery. Used to create products that require Cobalt." },
  { name: "Complex Machinery", category: "Advanced Tech", description: "Ironically, these components are found in many older fabricators and refineries, but cannot themselves be easily replicated." },
  { name: "Copper Ingot", category: "Refined Materials", description: "A Copper ingot. refined from Copper Ore at any Ore Refinery. Used to create products that require Copper." },
  { name: "Copper Ore", category: "Raw Materials", description: "Copper ore, mined from a Copper deposit. Can be refined into Copper Ingots at any Ore Refinery to create new products that require it." },
  { name: "Corpse", category: "Raw Materials", description: "Dead body that can be processed into water using a Deathstill." },
  { name: "Diamodine Blade Parts", category: "Weapons", description: "A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Diamondine Dust", category: "Raw Materials", description: "This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why." },
  { name: "Duraluminum Ingot", category: "Refined Materials", description: "A Duraluminum ingot, refined from Aluminum Ingots and Jasmium Crystals at a Medium Ore Refinery. Used to create products that require Duraluminum." },
  { name: "EMF Generator", category: "Electronics", description: "A fabrication component found in Fremen areas, such as caves. Used in Cutterays." },
  { name: "Erythrite Crystal", category: "Raw Materials", description: "Erythrite Crystal, mined from an Erythrite deposit in the Hagga Rift. Can be refined into Cobalt Paste at a Chemical Refinery to create new products that require it." },
  { name: "Flour Sand", category: "Raw Materials", description: "Found in flour sand drifts on the open sands. predominantly in the Vermilius Gap. Can be harvested by hand or with a Static Compactor. Can be refined into Silicone Blocks in a Chemical Refinery." },
  { name: "Fluid Efficient Industrial Pump", category: "Advanced Tech", description: "A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Fluted Heavy Caliber Compressor", category: "Weapons", description: "A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Fluted Light Caliber Compressor", category: "Weapons", description: "A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Fuel Cell", category: "Energy", description: "Found throughout the world, fuel cells can generate power for bases directly when loaded into a Fuel Generator. They can be refined at a Chemical Refinery into Vehicle Fuel Cells to power vehicles." },
  { name: "Granite Stone", category: "Raw Materials", description: "Stronger than the sandstones that crumble in the storms that sweep across Arrakis, granite stone is widely used as a basic building material. It is found almost everywhere there is dirt." },
  { name: "Gun Parts", category: "Weapons", description: "Key components for a wide variety of standard ranged weapons, often salvaged from the bodies of those who no longer have need for them." },
  { name: "Heavy Caliber Compressor", category: "Weapons", description: "The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes." },
  { name: "Holtzman Actuator", category: "Electronics", description: "Those who make regular use of suspensor belts and similar technology often leave caches of these replacement parts in places only they can reach." },
  { name: "Hydraulic Piston", category: "Vehicles", description: "A component used to craft vehicle engines. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrested them from their control." },
  { name: "Improved Holtzman Actuator", category: "Electronics", description: "A Traversal crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Improved Watertube", category: "Survival", description: "A stillsuit crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator." },
  { name: "Industrial Pump", category: "Tools", description: "There are few uses for industrial-strength pumps on a planet as dry as Arrakis, but the Sandflies do utilize them in their operations in Sentinel City." },
  { name: "Industrial-grade Lubricant", category: "Refined Materials", description: "An industrial quality lubricant required for directional wind turbines to function. Can be refined in a chemical refinery." },
  { name: "Insulated Fabric", category: "Survival", description: "Insulated fabric was one of the cottage industries of the O'odham, before the pyons were displaced from their old villages." },
  { name: "Iron Ingot", category: "Refined Materials", description: "An Iron Ingot, refined from Iron Ore at any Ore refinery. Used to create products that require Iron. Can also be further processed into Steel with Carbon Ore." },
  { name: "Iron Ore", category: "Raw Materials", description: "Iron ore, mined from an Iron deposit. Can be refined into Iron Ingots at any Ore Refinery to create new products that require it." },
  { name: "Irradiated Core", category: "Energy", description: "A power crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Irradiated Slag", category: "Raw Materials", description: "A looted component used in crafting. Found in Radiated Core in the Sheol." },
  { name: "Jasmium Crystal", category: "Raw Materials", description: "Jasmium Crystal, mined from a Jasmium deposit. Can be refined together with Aluminum Ingots into Duraluminum Ingots at a Medium Ore Refinery to create new products that require it." },
  { name: "Large Vehicle Fuel", category: "Energy", description: "Vehicle Fuel Cell with high capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles." },
  { name: "Light Caliber Compressor", category: "Weapons", description: "The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes." },
  { name: "Low-grade Lubricant", category: "Refined Materials", description: "A low-grade lubricant required for omnidirectional wind turbines to function. Can be refined in a chemical refinery." },
  { name: "Makeshift Filter", category: "Refined Materials", description: "A filter with simple functionality to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator." },
  { name: "Mechanical Parts", category: "Tools", description: "A fabrication component used in firearms. Found in Great House ruins, such as Shipwrecks." },
  { name: "Medium Sized Vehicle Fuel Cell", category: "Energy", description: "Vehicle Fuel Cell with average capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles." },
  { name: "Micro-sandwich Fabric", category: "Survival", description: "The Micro-Sandwich Fabric is a shorthand for the multi-layered water recycling component used in Fremen equipment such as stillsuits. Look for these in caves." },
  { name: "Military Power Regulator", category: "Energy", description: "A component used to craft vehicle power units. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrestled them from their control." },
  { name: "Mouse Corpse", category: "Raw Materials", description: "A dead Muad'dib. Can be consumed to drink some blood as a last resort." },
  { name: "Off-world Medical Supplies", category: "Survival", description: "Fremen medical tradition relies on only what the desert provides. Everyone else uses off-world pharmaceuticals, if they can get them." },
  { name: "Opafire Gem", category: "Luxury", description: "One of the rare opaline jewels of Hagal. They shimmer with a captivating blend of fiery reds and cool iridescent hues." },
  { name: "Overclocked Power Regulator", category: "Energy", description: "A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Particle Capacitor", category: "Electronics", description: "A fabrication component found in Old Imperial remnants, such as Imperial Testing Stations. Used in Holtzman tech or special constructions such as Boost modules for vehicles." },
  { name: "Particulate Filter", category: "Refined Materials", description: "A thorough filter to catch any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in a Survival Fabricator." },
  { name: "Plant Fiber", category: "Raw Materials", description: "Resource that can be picked everywhere in the world where there is solid land for it to take root. Woven to fibers used in armor and in bandages." },
  { name: "Plastanium Ingot", category: "Refined Materials", description: "Pure titanium is extracted from its ore, heated until liquid, and then carefully threaded with stravidium fibers to enhance its strength." },
  { name: "Plasteel Composite Armor Plating", category: "Armor", description: "An Armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Plasteel Composite Blade Parts", category: "Weapons", description: "A Melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Plasteel Composite Gun Parts", category: "Weapons", description: "A Ranged Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Ladsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Plasteel Microflora Fiber", category: "Armor", description: "A fabrication component used in armor. Found in Great House ruins, such as Shipwrecks." },
  { name: "Plasteel Plate", category: "Advanced Tech", description: "A crafting component for crafting plasteel crafting components. Can be found in the Deep Desert, or obtained from Landsraad rewards." },
  { name: "Plastone", category: "Construction", description: "An artificial composite of Silicone and Basalt used in sandstorm-resistant construction." },
  { name: "Precision Range Finder", category: "Weapons", description: "A Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Range Finder", category: "Tools", description: "Unsurprisingly, if you want to acquire a range-finder, look for sharpshooters. But remember, if you can see them, they can probably see you." },
  { name: "Ray Amplifier", category: "Tools", description: "Industrial production of bulk ores still commonly relies on drilling, but for mining more delicate materials such as crystals, a sophisticated cutteray is worth the investment. This type of equipment was used extensively to mine large parts of the Hagga Rift." },
  { name: "Salvaged Metal", category: "Raw Materials", description: "This metal has been salvaged from wreckage left on Arrakis. Can be recovered with a Cutteray. Used for crafting rudimentary metal items." },
  { name: "Sandtrout Leathers", category: "Survival", description: "The Maas Kharet have a particular affinity with this type of leather, and often make use of it in their clothing." },
  { name: "Ship Manifest", category: "Intelligence", description: "Detailed records of cargo, crew, and routes. Useful for monitoring covert trade routes and spice shipments." },
  { name: "Silicone Block", category: "Refined Materials", description: "A block of plastic refined from Flour Sand in a Chemical Refinery. Can be used to create new products that require it." },
  { name: "Small Vehicle Fuel Cell", category: "Energy", description: "Vehicle Fuel Cell with low capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles." },
  { name: "Solari", category: "Luxury", description: "Solaris are the currency of the Imperium. Use it to buy goods from vendors. Upon defeat you drop your Solaris, so be sure to visit a banker in villages to deposit them for safekeeping." },
  { name: "Spice Melange", category: "Spice Operations", description: "Made from Spice Sand at a Spice Refinery. The most sought-after resource in the universe. Enables intergalactic travel and extends life. Addictive. Withdrawal leads to death." },
  { name: "Spice Residue", category: "Spice Operations", description: "Residue left from spice refining useful in crafting." },
  { name: "Spice Sand", category: "Spice Operations", description: "Can be harvested by hand or with a Static Compactor at Spice Blow sites before the Worm arrives. Can be refined into valuable Spice Melange at a Spice Refinery." },
  { name: "Spice-infused Aluminum Dust", category: "Spice Operations", description: "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers." },
  { name: "Spice-infused Copper Dust", category: "Spice Operations", description: "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers." },
  { name: "Spice-infused Duraluminum Dust", category: "Spice Operations", description: "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers." },
  { name: "Spice-infused Fuel Cell", category: "Spice Operations", description: "A fuel cell for spice-powered generators. Made from fuel cells and spice residue. Can be refined in a Medium Chemical Refinery." },
  { name: "Spice-Infused Iron Dust", category: "Spice Operations", description: "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers." },
  { name: "Spice-infused Plastanium Dust", category: "Spice Operations", description: "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers." },
  { name: "Spice-Infused Steel Dust", category: "Spice Operations", description: "Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers." },
  { name: "Standard Filter", category: "Refined Materials", description: "A CHOAM-patented filter with improved protection against the harsh winds of Arakkis. Needed to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator." },
  { name: "Steel Ingot", category: "Refined Materials", description: "A Steel ingot refined from Carbon Ore and Iron Ingot at any Ore Refinery. Used to create products that require Steel." },
  { name: "Stillsuit Tubing", category: "Survival", description: "The best tubing of course comes from the Fremen, but they do not share. The Maas Kharet are seen by many as a cheap imitation of the Fremen, and they produce a cheapimitation of Fremen stillsuit tubing." },
  { name: "Stravidium Fiber", category: "Refined Materials", description: "These fibers are carefully drawn from a chemically-treated stravidium mass, and used in the production of plastanium." },
  { name: "Stravidium Mass", category: "Raw Materials", description: "Raw stravidium mass can be found in the deep desert, and refined into fibers." },
  { name: "Thermo-Responsive Ray Amplifier", category: "Tools", description: "A Utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." },
  { name: "Thermoelectric Cooler", category: "Tools", description: "A crafting component used to cool down Harvesting tools used in the Deep Desert. Spare parts are usually found in the Deep Desert on the Shield Wall." },
  { name: "Titanium Ore", category: "Raw Materials", description: "Titanium ore is found in the deep desert, and most commonly utilized in the production of plastanium, an alloy of titanium and stravidium." },
  { name: "Tri-Forged Hydraulic Piston", category: "Vehicles", description: "A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator." }
];

async function main() {
  console.log('🔧 Resetting Production Database with Your Original Resources...\n');

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Clear existing data
    console.log('🗑️ Clearing existing resources, leaderboard, and history...');
    await db.execute('DELETE FROM resource_history');
    await db.execute('DELETE FROM leaderboard');
    await db.execute('DELETE FROM resources');
    await db.execute('DELETE FROM guilds');
    console.log('✅ Cleared all data\n');

    // Create guilds
    console.log('🏰 Creating guilds...');
    const currentTime = Math.floor(Date.now() / 1000);
    
    await db.execute({
      sql: `INSERT INTO guilds (id, title, discord_guild_id, max_members, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['house-melange', 'House Melange', DISCORD_GUILD_ID, 50, currentTime, currentTime]
    });
    console.log('✅ Created guild: House Melange');

    await db.execute({
      sql: `INSERT INTO guilds (id, title, discord_guild_id, max_members, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['whitelist-second-guild', 'Whitelist Second Guild', DISCORD_GUILD_ID, 50, currentTime, currentTime]
    });
    console.log('✅ Created guild: Whitelist Second Guild\n');

    // Create resources for both guilds
    console.log(`📦 Creating ${USER_RESOURCES.length} resources for each guild...\n`);
    
    for (const guild of ['house-melange', 'whitelist-second-guild']) {
      console.log(`Creating resources for ${guild === 'house-melange' ? 'House Melange' : 'Whitelist Second Guild'}...`);
      
      for (const resource of USER_RESOURCES) {
        const resourceId = nanoid(12);
        
        await db.execute({
          sql: `INSERT INTO resources (
            id, guild_id, name, category, description, quantity, target_quantity,
            multiplier, status, last_updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            resourceId,
            guild,
            resource.name,
            resource.category,
            resource.description,
            0,                    // quantity
            1000,                 // target_quantity
            1.0,                  // multiplier
            'critical',           // status (0/1000 = critical)
            'System',             // last_updated_by
            currentTime,
            currentTime
          ]
        });
      }
      
      console.log(`✅ Created ${USER_RESOURCES.length} resources for ${guild === 'house-melange' ? 'House Melange' : 'Whitelist Second Guild'}\n`);
    }

    console.log('📊 Verification:');
    console.log(`  House Melange: ${USER_RESOURCES.length} resources`);
    console.log(`  Whitelist Second Guild: ${USER_RESOURCES.length} resources`);
    console.log('');
    console.log('✅ Setup complete!');
    console.log('');
    console.log('Both guilds now have:');
    console.log(`  - ${USER_RESOURCES.length} YOUR original resources with descriptions`);
    console.log('  - Each resource: 0/1000 (critical status)');
    console.log('  - Clean leaderboards');
    console.log('  - No history');
    console.log('');
    console.log('🏁 Script completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main().catch(console.error);
