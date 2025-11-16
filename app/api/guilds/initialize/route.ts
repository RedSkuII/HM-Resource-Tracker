import { NextRequest, NextResponse } from 'next/server'
import { db, resources, resourceHistory, leaderboard, discordOrders, resourceDiscordMapping, websiteChanges, botActivityLogs } from '@/lib/db'
import { eq, inArray, isNotNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Standard 95 resources template (Dune: Awakening)
const STANDARD_RESOURCES = [
  { name: 'Advanced Machinery', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', multiplier: 1.0, imageUrl: 'https://img.game8.co/4210936/6d63b2a2351c6c430d04e6972e9ea89d.png/show' },
  { name: 'Advanced Particulate Filter', category: 'Refined Materials', description: 'An advanced filter for catching any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in an Advanced Survival Fabricator.', icon: '🌪️', multiplier: 1.0, imageUrl: 'https://img.game8.co/4212929/5c8dc2e26f448f5b98803d67905ccb4d.png/show' },
  { name: 'Advanced Servoks', category: 'Components', description: 'A fabrication component used in vehicles such as Sandbikes. Found in Old Imperial remnants, such as Imperial Testing Stations.', icon: '🔧', multiplier: 1.0, imageUrl: 'https://img.game8.co/4195778/caa5e61bb326907a0824bbcec8167115.png/show' },
  { name: 'Agave Seeds', category: 'Raw Materials', description: 'In common with its distant ancestors, the fruits of the Arrakeen Agave contain a large mass of seeds, which are put to many uses by those who have ready access to them.', icon: '🌱', imageUrl: 'https://img.game8.co/4197456/0f7c38d0ee8187c5829c0b03fd9fded4.png/show', multiplier: 1.0 },
  { name: 'Aluminum Ingot', category: 'Refined Materials', description: 'An Aluminum ingot, refined from Aluminum Ore at a Medium Ore Refinery. Used to create products that require Aluminum. Can also be further processed into Duraluminum with Jasmium Crystals.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195811/e4efeaa6d143ab17a0db4f918181d9f3.png/show', multiplier: 1.0 },
  { name: 'Aluminum Ore', category: 'Raw Materials', description: 'Aluminum ore, mined from an Aluminum deposit. Can be refined into Aluminum Ingots at a Medium Ore Refinery to create new products that require it.', icon: '⛏️', imageUrl: 'https://img.game8.co/4195186/3219ab33fa7aca8ff5e35cf648526d63.png/show', multiplier: 1.0 },
  { name: 'Armor Plating', category: 'Components', description: 'Strengthened Plating can be liberated from those who make use of them in their heavy armor, and repurposed to other ends.', icon: '🛡️', imageUrl: 'https://img.game8.co/4195775/2656e22089d2384c59837609241d46e7.png/show', multiplier: 1.0 },
  { name: 'Atmospheric Filtered Fabric', category: 'Components', description: 'A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🧵', imageUrl: 'https://img.game8.co/4212930/ff00919955f40d9f1b253caa14ac7d6d.png/show', multiplier: 1.0 },
  { name: 'Ballistic Weave Fabric', category: 'Components', description: 'A light armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.', icon: '🧵', imageUrl: 'https://img.game8.co/4210931/0b6dc08d3e4714744c9d8d5cb3a66e3a.png/show', multiplier: 1.0 },
  { name: 'Basalt Stone', category: 'Raw Materials', description: 'Stone which can be refined for usage in construction.', icon: '🪨', imageUrl: 'https://img.game8.co/4195187/40c67e49f75964a27fbaade4acc6bf4a.png/show', multiplier: 1.0 },
  { name: 'Blade Parts', category: 'Components', description: 'Even the wide variety of melee weapons tend to use standardized parts for their handful of complex elements. These can often be found on the bodies of those who favor the blade, or in their storage lockers', icon: '🗡️', imageUrl: 'https://img.game8.co/4197102/b85fe96675e74c6956aea34a732f7c0f.png/show', multiplier: 1.0 },
  { name: 'Calibrated Servok', category: 'Components', description: 'These specialist servoks are commonly repurposed from heavy-duty equipment. This type of equipment was used extensively in Jabal Eifrit.', icon: '🔧', imageUrl: 'https://img.game8.co/4195852/60eed973d440938a988c4175c5def35e.png/show', multiplier: 1.0 },
  { name: 'Carbide Blade Parts', category: 'Components', description: 'A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.', icon: '🗡️', imageUrl: 'https://img.game8.co/4201722/1a586c851dfa82337337d91dbe785c5c.png/show', multiplier: 1.0 },
  { name: 'Carbide Scraps', category: 'Components', description: 'This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why.', icon: '🔧', imageUrl: 'https://img.game8.co/4195789/bc5d81156ecfe8efb98246edd9aa6292.png/show', multiplier: 1.0 },
  { name: 'Carbon Ore', category: 'Raw Materials', description: 'Carbon ore, mined from a Carbon deposit. Can be processed with Iron Ingots together to create refined Steel Ingots at any Ore Refinery to create new products that require it.', icon: '⛏️', imageUrl: 'https://img.game8.co/4197101/de2ac63b103d101c427d5a132b77dcf6.png/show', multiplier: 1.0 },
  { name: 'Cobalt Paste', category: 'Refined Materials', description: 'A dissolution of Cobalt, refined from Erythrite Crystal from the Hagga Rift at a Chemical Refinery. Used to create products that require Cobalt.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195812/7367c141ffc30ae1bbd75eecb528f452.png/show', multiplier: 1.0 },
  { name: 'Complex Machinery', category: 'Components', description: 'Ironically, these components are found in many older fabricators and refineries, but cannot themselves be easily replicated.', icon: '🔧', imageUrl: 'https://img.game8.co/4195786/3690c24218ab840c5c84923b4f1eeb3c.png/show', multiplier: 1.0 },
  { name: 'Copper Ingot', category: 'Refined Materials', description: 'A Copper ingot. refined from Copper Ore at any Ore Refinery. Used to create products that require Copper.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195813/be826ac1e1e68c463cdada402d530513.png/show', multiplier: 1.0 },
  { name: 'Copper Ore', category: 'Raw Materials', description: 'Copper ore, mined from a Copper deposit. Can be refined into Copper Ingots at any Ore Refinery to create new products that require it.', icon: '⛏️', imageUrl: 'https://img.game8.co/4195230/e2733f33453dbe2e536ebb5d1b504286.png/show', multiplier: 1.0 },
  { name: 'Corpse', category: 'Raw Materials', description: 'Dead body that can be processed into water using a Deathstill.', icon: '💀', imageUrl: 'https://img.game8.co/4210932/f958659a6728cb620a75cd077afb62f7.png/show', multiplier: 1.0 },
  { name: 'Diamodine Blade Parts', category: 'Components', description: 'A melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🗡️', imageUrl: 'https://img.game8.co/4210933/f4a95368e8d5052541ecce634d1923fb.png/show', multiplier: 1.0 },
  { name: 'Diamondine Dust', category: 'Components', description: 'This industrial byproduct is closely guarded by the Maas Kharet in their most sacred site. Nobody is entirely sure why.', icon: '🔧', imageUrl: 'https://img.game8.co/4195776/023223975b676b8b1739c31995847eaa.png/show', multiplier: 1.0 },
  { name: 'Duraluminum Ingot', category: 'Refined Materials', description: 'A Duraluminum ingot, refined from Aluminum Ingots and Jasmium Crystals at a Medium Ore Refinery. Used to create products that require Duraluminum.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195814/49402a36f18b93fa44539c1c69860e3c.png/show', multiplier: 1.0 },
  { name: 'EMF Generator', category: 'Components', description: 'A fabrication component found in Fremen areas, such as caves. Used in Cutterays.', icon: '⚡', imageUrl: 'https://img.game8.co/4197112/b6703254e93cc515c6b179430816d1f8.png/show', multiplier: 1.0 },
  { name: 'Erythrite Crystal', category: 'Raw Materials', description: 'Erythrite Crystal, mined from an Erythrite deposit in the Hagga Rift. Can be refined into Cobalt Paste at a Chemical Refinery to create new products that require it.', icon: '💎', imageUrl: 'https://img.game8.co/4195188/346ded1173904e5f84dd56e7f9feb1e0.png/show', multiplier: 1.0 },
  { name: 'Flour Sand', category: 'Raw Materials', description: 'Found in flour sand drifts on the open sands. predominantly in the Vermilius Gap. Can be harvested by hand or with a Static Compactor. Can be refined into Silicone Blocks in a Chemical Refinery.', icon: '⏳', imageUrl: 'https://img.game8.co/4195821/924b38b0c9c8b09f4be58a69a39dd33b.png/show', multiplier: 1.0 },
  { name: 'Fluid Efficient Industrial Pump', category: 'Components', description: 'A utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🚰', imageUrl: 'https://img.game8.co/4195805/965d2195b175067c25393a0aeca41c1c.png/show', multiplier: 1.0 },
  { name: 'Fluted Heavy Caliber Compressor', category: 'Components', description: 'A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', imageUrl: 'https://img.game8.co/4201692/fe1dda79ad06f3f0bd8effcd7db12408.png/show', multiplier: 1.0 },
  { name: 'Fluted Light Caliber Compressor', category: 'Components', description: 'A weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', imageUrl: 'https://img.game8.co/4199460/2663612f3e765d6731ed966325168226.png/show', multiplier: 1.0 },
  { name: 'Fuel Cell', category: 'Raw Materials', description: 'Found throughout the world, fuel cells can generate power for bases directly when loaded into a Fuel Generator. They can be refined at a Chemical Refinery into Vehicle Fuel Cells to power vehicles.', icon: '🔋', imageUrl: 'https://img.game8.co/4197098/9eb87bf1a32cf5374babf32386039520.png/show', multiplier: 1.0 },
  { name: 'Granite Stone', category: 'Raw Materials', description: 'Stronger than the sandstones that crumble in the storms that sweep across Arrakis, granite stone is widely used as a basic building material. It is found almost everywhere there is dirt.', icon: '🪨', imageUrl: 'https://img.game8.co/4195228/b413cf7b6e471d9944ef8d182349957c.png/show', multiplier: 1.0 },
  { name: 'Gun Parts', category: 'Components', description: 'Key components for a wide variety of standard ranged weapons, often salvaged from the bodies of those who no longer have need for them.', icon: '🔫', imageUrl: 'https://img.game8.co/4197252/7a5f82f1b3738f129a88c8c6c58c0efe.png/show', multiplier: 1.0 },
  { name: 'Heavy Caliber Compressor', category: 'Components', description: 'The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes.', icon: '🔧', imageUrl: 'https://img.game8.co/4195804/d6f82b71c0390b4703cd4ec9bc71dd48.png/show', multiplier: 1.0 },
  { name: 'Holtzman Actuator', category: 'Components', description: 'Those who make regular use of suspensor belts and similar technology often leave caches of these replacement parts in places only they can reach.', icon: '⚡', imageUrl: 'https://img.game8.co/4197117/6465b140337509480e078baa91636971.png/show', multiplier: 1.0 },
  { name: 'Hydraulic Piston', category: 'Components', description: 'A component used to craft vehicle engines. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrested them from their control.', icon: '🚜', imageUrl: 'https://img.game8.co/4195801/a26ba5fcaa9a178184ae2c944fa4f810.png/show', multiplier: 1.0 },
  { name: 'Improved Holtzman Actuator', category: 'Components', description: 'A Traversal crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '⚡', imageUrl: 'https://img.game8.co/4210937/646e74b3d9775727a084c71139e5ece6.png/show', multiplier: 1.0 },
  { name: 'Improved Watertube', category: 'Components', description: 'A stillsuit crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards or crafted in an Advanced Survival Fabricator.', icon: '🔧', imageUrl: 'https://img.game8.co/4199462/a68fec59df1e17220927c4683d6985a2.png/show', multiplier: 1.0 },
  { name: 'Industrial Pump', category: 'Components', description: 'There are few uses for industrial-strength pumps on a planet as dry as Arrakis, but the Sandflies do utilize them in their operations in Sentinel City.', icon: '🚰', imageUrl: 'https://img.game8.co/4197107/5cf73a5dcf32478c78a4437db3180725.png/show', multiplier: 1.0 },
  { name: 'Industrial-grade Lubricant', category: 'Refined Materials', description: 'An industrial quality lubricant required for directional wind turbines to function. Can be refined in a chemical refinery.', icon: '⚙️', imageUrl: 'https://img.game8.co/4197254/ff373fb37445fd8d369baddc325baeca.png/show', multiplier: 1.0 },
  { name: 'Insulated Fabric', category: 'Components', description: 'Insulated fabric was one of the cottage industries of the O\'odham, before the pyons were displaced from their old villages.', icon: '🧵', imageUrl: 'https://img.game8.co/4195788/723a718d9f2b718bdf9ab5d2e55acc50.png/show', multiplier: 1.0 },
  { name: 'Iron Ingot', category: 'Refined Materials', description: 'An Iron Ingot, refined from Iron Ore at any Ore refinery. Used to create products that require Iron. Can also be further processed into Steel with Carbon Ore.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195815/7bdd0dfa4df9bcdbe2ef9c228b56e1b9.png/show', multiplier: 1.0 },
  { name: 'Iron Ore', category: 'Raw Materials', description: 'Iron ore, mined from an Iron deposit. Can be refined into Iron Ingots at any Ore Refinery to create new products that require it.', icon: '⛏️', imageUrl: 'https://img.game8.co/4195839/38fee477bfc17e0d446c0194e87c735f.png/show', multiplier: 1.0 },
  { name: 'Irradiated Core', category: 'Components', description: 'A power crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '⚡', imageUrl: 'https://img.game8.co/4195830/1ab5d4de0e84e8dcc05a75799940a109.png/show', multiplier: 1.0 },
  { name: 'Irradiated Slag', category: 'Components', description: 'A looted component used in crafting. Found in Radiated Core in the Sheol.', icon: '🔧', imageUrl: 'https://img.game8.co/4195809/28d9b7c0889f792a38aa33d088341ada.png/show', multiplier: 1.0 },
  { name: 'Jasmium Crystal', category: 'Raw Materials', description: 'Jasmium Crystal, mined from a Jasmium deposit. Can be refined together with Aluminum Ingots into Duraluminum Ingots at a Medium Ore Refinery to create new products that require it.', icon: '💎', imageUrl: 'https://img.game8.co/4195823/ad55ba358bbe59f397e8deba7fad3933.png/show', multiplier: 1.0 },
  { name: 'Large Vehicle Fuel', category: 'Refined Materials', description: 'Vehicle Fuel Cell with high capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.', icon: '🔋', imageUrl: 'https://img.game8.co/4209737/89e2a47c950d9102b783b6eec29f4cae.png/show', multiplier: 1.0 },
  { name: 'Light Caliber Compressor', category: 'Components', description: 'The Sandflies often keep stashes of these components in their outposts, as they can be turned to various useful purposes.', icon: '🔧', imageUrl: 'https://img.game8.co/4195798/067317f9a961911634e7a6b9d01f43d8.png/show', multiplier: 1.0 },
  { name: 'Low-grade Lubricant', category: 'Refined Materials', description: 'A low-grade lubricant required for omnidirectional wind turbines to function. Can be refined in a chemical refinery.', icon: '⚙️', imageUrl: 'https://img.game8.co/4197253/3a8db5154eeba1467350321d6794a126.png/show', multiplier: 1.0 },
  { name: 'Makeshift Filter', category: 'Refined Materials', description: 'A filter with simple functionality to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator.', icon: '🌪️', imageUrl: 'https://img.game8.co/4197118/3055870ac9579509d88c67c25952da27.png/show', multiplier: 1.0 },
  { name: 'Mechanical Parts', category: 'Components', description: 'A fabrication component used in firearms. Found in Great House ruins, such as Shipwrecks.', icon: '🔧', imageUrl: 'https://img.game8.co/4195796/13697d37287c58ff598c3c22bf49cf75.png/show', multiplier: 1.0 },
  { name: 'Medium Sized Vehicle Fuel Cell', category: 'Refined Materials', description: 'Vehicle Fuel Cell with average capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.', icon: '🔋', imageUrl: 'https://img.game8.co/4197113/3bb3c77a224bd1257595f0a61c78696b.png/show', multiplier: 1.0 },
  { name: 'Micro-sandwich Fabric', category: 'Components', description: 'The Micro-Sandwich Fabric is a shorthand for the multi-layered water recycling component used in Fremen equipment such as stillsuits. Look for these in caves.', icon: '🧵', imageUrl: 'https://img.game8.co/4197100/c9711d331e765eb0e6a22cefb8ba558e.png/show', multiplier: 1.0 },
  { name: 'Military Power Regulator', category: 'Components', description: 'A component used to craft vehicle power units. The Great Houses have a stranglehold on this type of component on Arrakis and any who possess them must have forcibly wrestled them from their control.', icon: '🔌', imageUrl: 'https://img.game8.co/4195800/dd31521d39bd8046c5f78aaf5da8dd09.png/show', multiplier: 1.0 },
  { name: 'Mouse Corpse', category: 'Raw Materials', description: 'A dead Muad\'dib. Can be consumed to drink some blood as a last resort.', icon: '💀', imageUrl: 'https://img.game8.co/4197110/586cde52313f7f06f0d1561b0f7ecd47.png/show', multiplier: 1.0 },
  { name: 'Off-world Medical Supplies', category: 'Components', description: 'Fremen medical tradition relies on only what the desert provides. Everyone else uses off-world pharmaceuticals, if they can get them.', icon: '💊', imageUrl: 'https://img.game8.co/4197457/b927ccaeab2bce6445e0d261dd5f0956.png/thumb', multiplier: 1.0 },
  { name: 'Opafire Gem', category: 'Components', description: 'One of the rare opaline jewels of Hagal. They shimmer with a captivating blend of fiery reds and cool iridescent hues.', icon: '💠', imageUrl: 'https://img.game8.co/4201725/944a5f941de2e7e54aa21a6a9dbb7adc.png/show', multiplier: 1.0 },
  { name: 'Overclocked Power Regulator', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔌', imageUrl: 'https://img.game8.co/4199464/6e5e81198ebd3360040f9c96efbb97da.png/show', multiplier: 1.0 },
  { name: 'Particle Capacitor', category: 'Components', description: 'A fabrication component found in Old Imperial remnants, such as Imperial Testing Stations. Used in Holtzman tech or special constructions such as Boost modules for vehicles.', icon: '🔌', imageUrl: 'https://img.game8.co/4195779/ebfea449abcfc3ca8b5184d53605291b.png/show', multiplier: 1.0 },
  { name: 'Particulate Filter', category: 'Refined Materials', description: 'A thorough filter to catch any unwanted particles, dust and sand. Needed to keep Windtraps running and clear of sand. Fitted for Larger Windtraps. Can be crafted in a Survival Fabricator.', icon: '🌪️', imageUrl: 'https://img.game8.co/4197116/d2dbe995e9e794a07d799abb263d0612.png/show', multiplier: 1.0 },
  { name: 'Plant Fiber', category: 'Raw Materials', description: 'Resource that can be picked everywhere in the world where there is solid land for it to take root. Woven to fibers used in armor and in bandages.', icon: '🌿', imageUrl: 'https://img.game8.co/4197099/ce8073b538215e3b003a1d353c1573c2.png/show', multiplier: 1.0 },
  { name: 'Plastanium Ingot', category: 'Refined Materials', description: 'Pure titanium is extracted from its ore, heated until liquid, and then carefully threaded with stravidium fibers to enhance its strength.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195816/fbec0ec53f52bc7cf1545b5c1e7fd594.png/show', multiplier: 1.0 },
  { name: 'Plasteel Composite Armor Plating', category: 'Components', description: 'An Armor crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔩', imageUrl: 'https://img.game8.co/4199465/f91014b6474f5304eaf916edc03ab907.png/show', multiplier: 1.0 },
  { name: 'Plasteel Composite Blade Parts', category: 'Components', description: 'A Melee weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔩', imageUrl: 'https://img.game8.co/4201726/9852f86ab7dc168668ea7488c81c611f.png/show', multiplier: 1.0 },
  { name: 'Plasteel Composite Gun Parts', category: 'Components', description: 'A Ranged Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Ladsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔩', imageUrl: 'https://img.game8.co/4210938/0110195db769491877da8aa53dc7338e.png/show', multiplier: 1.0 },
  { name: 'Plasteel Microflora Fiber', category: 'Components', description: 'A fabrication component used in armor. Found in Great House ruins, such as Shipwrecks.', icon: '🔩', imageUrl: 'https://img.game8.co/4195777/165fc57d10a439670c8104a4d9cc230b.png/show', multiplier: 1.0 },
  { name: 'Plasteel Plate', category: 'Components', description: 'A crafting component for crafting plasteel crafting components. Can be found in the Deep Desert, or obtained from Landsraad rewards.', icon: '🔩', imageUrl: 'https://img.game8.co/4201691/bc1c0550cdc8cec788a9dd30212a55e5.png/show', multiplier: 1.0 },
  { name: 'Plastone', category: 'Refined Materials', description: 'An artificial composite of Silicone and Basalt used in sandstorm-resistant construction.', icon: '⚙️', imageUrl: 'https://img.game8.co/4197422/d98b1ec1c0a678621738c4416b1491b0.png/show', multiplier: 1.0 },
  { name: 'Precision Range Finder', category: 'Components', description: 'A Weapon crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', imageUrl: 'https://img.game8.co/4201728/849927ea59657363526df16d986e1acf.png/show', multiplier: 1.0 },
  { name: 'Range Finder', category: 'Components', description: 'Unsurprisingly, if you want to acquire a range-finder, look for sharpshooters. But remember, if you can see them, they can probably see you.', icon: '🔧', imageUrl: 'https://img.game8.co/4197223/d92de94d459c816ec82c0057ae4ed7c2.png/show', multiplier: 1.0 },
  { name: 'Ray Amplifier', category: 'Components', description: 'Industrial production of bulk ores still commonly relies on drilling, but for mining more delicate materials such as crystals, a sophisticated cutteray is worth the investment. This type of equipment was used extensively to mine large parts of the Hagga Rift.', icon: '🔧', imageUrl: 'https://img.game8.co/4195808/875d0bdde3526408e056031960b10858.png/show', multiplier: 1.0 },
  { name: 'Salvaged Metal', category: 'Raw Materials', description: 'This metal has been salvaged from wreckage left on Arrakis. Can be recovered with a Cutteray. Used for crafting rudimentary metal items.', icon: '🔨', imageUrl: 'https://img.game8.co/4195229/71b5bae9f8795902852cd5af3dc2370e.png/show', multiplier: 1.0 },
  { name: 'Sandtrout Leathers', category: 'Components', description: 'The Maas Kharet have a particular affinity with this type of leather, and often make use of it in their clothing.', icon: '🧥', imageUrl: 'https://img.game8.co/4197106/c3586bcddead6e5d6a9ea2cd7f81de43.png/show', multiplier: 1.0 },
  { name: 'Ship Manifest', category: 'Components', description: 'Detailed records of cargo, crew, and routes. Useful for monitoring covert trade routes and spice shipments.', icon: '📋', imageUrl: 'https://img.game8.co/4195807/81dea516f0d30b13ff3bad3331e52f4e.png/show', multiplier: 1.0 },
  { name: 'Silicone Block', category: 'Refined Materials', description: 'A block of plastic refined from Flour Sand in a Chemical Refinery. Can be used to create new products that require it.', icon: '⚙️', imageUrl: 'https://img.game8.co/4197108/d82b575ce706cd3fc78ac36e3da32548.png/show', multiplier: 1.0 },
  { name: 'Small Vehicle Fuel Cell', category: 'Refined Materials', description: 'Vehicle Fuel Cell with low capacity. Refined from Fuel Cells at a Chemical Refinery. Used to power vehicles.', icon: '🔋', imageUrl: 'https://img.game8.co/4197421/f26067905553cc08b097b023752ca823.png/show', multiplier: 1.0 },
  { name: 'Solari', category: 'Currency', description: 'Solaris are the currency of the Imperium. Use it to buy goods from vendors. Upon defeat you drop your Solaris, so be sure to visit a banker in villages to deposit them for safekeeping.', icon: '💰', imageUrl: 'https://img.game8.co/4197251/18a659df54958ec28d70411b08cab052.png/show', multiplier: 1.0 },
  { name: 'Spice Melange', category: 'Refined Materials', description: 'Made from Spice Sand at a Spice Refinery. The most sought-after resource in the universe. Enables intergalactic travel and extends life. Addictive. Withdrawal leads to death.', icon: '🌟', imageUrl: 'https://img.game8.co/4195817/846f3cfe41890f74bb74a460e1a0268f.png/show', multiplier: 1.0 },
  { name: 'Spice Residue', category: 'Raw Materials', description: 'Residue left from spice refining useful in crafting.', icon: '✨', imageUrl: 'https://img.game8.co/4197109/0367df9f5e97fc4fb51b9b7d3e86b5ff.png/show', multiplier: 1.0 },
  { name: 'Spice Sand', category: 'Raw Materials', description: 'Can be harvested by hand or with a Static Compactor at Spice Blow sites before the Worm arrives. Can be refined into valuable Spice Melange at a Spice Refinery.', icon: '✨', imageUrl: 'https://img.game8.co/4195767/b34607e6b01db920185e753e8d3be41a.png/show', multiplier: 1.0 },
  { name: 'Spice-infused Aluminum Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', imageUrl: 'https://img.game8.co/4195185/47e613ef0ca4e18d47c801804c24c338.png/show', multiplier: 1.0 },
  { name: 'Spice-infused Copper Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', imageUrl: 'https://img.game8.co/4197103/6277b1479e313fa209579f88334673ca.png/show', multiplier: 1.0 },
  { name: 'Spice-infused Duraluminum Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', imageUrl: 'https://img.game8.co/4195184/cf5238c2ad17039ac8c868c27f51dd6c.png/show', multiplier: 1.0 },
  { name: 'Spice-infused Fuel Cell', category: 'Refined Materials', description: 'A fuel cell for spice-powered generators. Made from fuel cells and spice residue. Can be refined in a Medium Chemical Refinery.', icon: '✨', imageUrl: 'https://img.game8.co/4209738/4498a027946963d19543a1efee9fde61.png/show', multiplier: 1.0 },
  { name: 'Spice-Infused Iron Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', imageUrl: 'https://img.game8.co/4195787/a5e2c6b66dfd45cfa333262af9cf51ae.png/show', multiplier: 1.0 },
  { name: 'Spice-infused Plastanium Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', imageUrl: 'https://img.game8.co/4199463/5fba7b492bf8cc802ba0396258874237.png/show', multiplier: 1.0 },
  { name: 'Spice-Infused Steel Dust', category: 'Components', description: 'Truly Unique items often rely on spice-infused metal to enhance their qualities. Such metals are jealously horded by the most powerful groups, locked away in their most secure containers.', icon: '✨', imageUrl: 'https://img.game8.co/4195802/04465e143d437d52f0d8561dedea25ae.png/show', multiplier: 1.0 },
  { name: 'Standard Filter', category: 'Refined Materials', description: 'A CHOAM-patented filter with improved protection against the harsh winds of Arakkis. Needed to keep Windtraps running and clear of sand. Fitted for smaller Windtraps. Can be crafted in a Survival Fabricator.', icon: '🌪️', imageUrl: 'https://img.game8.co/4197115/5fcc084ff7b44029fa6c1752b04fcad7.png/show', multiplier: 1.0 },
  { name: 'Steel Ingot', category: 'Refined Materials', description: 'A Steel ingot refined from Carbon Ore and Iron Ingot at any Ore Refinery. Used to create products that require Steel.', icon: '⚙️', imageUrl: 'https://img.game8.co/4195810/1951441943336f3efbcc7a6ef802fde0.png/show', multiplier: 1.0 },
  { name: 'Stillsuit Tubing', category: 'Components', description: 'The best tubing of course comes from the Fremen, but they do not share. The Maas Kharet are seen by many as a cheap imitation of the Fremen, and they produce a cheapimitation of Fremen stillsuit tubing.', icon: '🔧', imageUrl: 'https://img.game8.co/4197114/442a5d0c886008153d112e0c41ac504b.png/show', multiplier: 1.0 },
  { name: 'Stravidium Fiber', category: 'Refined Materials', description: 'These fibers are carefully drawn from a chemically-treated stravidium mass, and used in the production of plastanium.', icon: '🧵', imageUrl: 'https://img.game8.co/4210878/ea795f9d691f9f09b12d6918d41b4b46.png/show', multiplier: 1.0 },
  { name: 'Stravidium Mass', category: 'Raw Materials', description: 'Raw stravidium mass can be found in the deep desert, and refined into fibers.', icon: '📦', imageUrl: 'https://img.game8.co/4211107/48a8aaebc69a170d10d013603c791462.png/show', multiplier: 1.0 },
  { name: 'Thermo-Responsive Ray Amplifier', category: 'Components', description: 'A Utility crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', imageUrl: 'https://img.game8.co/4210935/06caaa42558787bc695ddd780bb38864.png/show', multiplier: 1.0 },
  { name: 'Thermoelectric Cooler', category: 'Components', description: 'A crafting component used to cool down Harvesting tools used in the Deep Desert. Spare parts are usually found in the Deep Desert on the Shield Wall.', icon: '🔧', imageUrl: 'https://img.game8.co/4195785/1acd70832087149392efeacfd2144829.png/show', multiplier: 1.0 },
  { name: 'Titanium Ore', category: 'Raw Materials', description: 'Titanium ore is found in the deep desert, and most commonly utilized in the production of plastanium, an alloy of titanium and stravidium.', icon: '⛏️', imageUrl: 'https://img.game8.co/4201690/3da8201b1917c15f3df399d14bf506ea.png/show', multiplier: 1.0 },
  { name: 'Tri-Forged Hydraulic Piston', category: 'Components', description: 'A vehicle module crafting component used in plastanium tier crafting. Can be found in the Deep Desert, obtained from Landsraad rewards, or crafted in an Advanced Survival Fabricator.', icon: '🔧', imageUrl: 'https://img.game8.co/4210934/24cc4bde1b95ba6f03a645d482930a83.png/show', multiplier: 1.0 },
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
        
        try {
          // Delete resource history by resourceId (handles records without guildId)
          const deletedHistory = await db.delete(resourceHistory)
            .where(inArray(resourceHistory.resourceId, resourceIds))
            .returning()
          console.log(`[INIT] Deleted ${deletedHistory.length} history entries`)
        } catch (error) {
          console.error('[INIT] Error deleting resource history:', error)
          throw new Error(`Failed to delete resource history: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        try {
          // Delete leaderboard entries by resourceId (handles records without guildId)
          const deletedLeaderboard = await db.delete(leaderboard)
            .where(inArray(leaderboard.resourceId, resourceIds))
            .returning()
          console.log(`[INIT] Deleted ${deletedLeaderboard.length} leaderboard entries`)
        } catch (error) {
          console.error('[INIT] Error deleting leaderboard:', error)
          throw new Error(`Failed to delete leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        try {
          // Delete Discord orders (has guildId)
          const deletedOrders = await db.delete(discordOrders)
            .where(eq(discordOrders.guildId, guildId))
            .returning()
          console.log(`[INIT] Deleted ${deletedOrders.length} Discord orders`)
        } catch (error) {
          console.error('[INIT] Error deleting Discord orders:', error)
          throw new Error(`Failed to delete Discord orders: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        try {
          // Delete resource Discord mapping (has guildId)
          const deletedMappings = await db.delete(resourceDiscordMapping)
            .where(eq(resourceDiscordMapping.guildId, guildId))
            .returning()
          console.log(`[INIT] Deleted ${deletedMappings.length} Discord resource mappings`)
        } catch (error) {
          console.error('[INIT] Error deleting Discord mappings:', error)
          throw new Error(`Failed to delete Discord mappings: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      try {
        // Delete resources LAST (parent table)
        
        // DEBUG: Check what might still be referencing these resources
        console.log('[INIT] DEBUG: Checking for remaining references before deleting resources...')
        
        if (resourceIds.length > 0) {
          // Check each table that might have references
          try {
            const remainingHistory = await db.select().from(resourceHistory).where(inArray(resourceHistory.resourceId, resourceIds))
            console.log(`[INIT] DEBUG: Found ${remainingHistory.length} remaining resourceHistory records`)
          } catch (e) {
            console.log('[INIT] DEBUG: Error checking resourceHistory:', e)
          }
          
          try {
            const remainingLeaderboard = await db.select().from(leaderboard).where(inArray(leaderboard.resourceId, resourceIds))
            console.log(`[INIT] DEBUG: Found ${remainingLeaderboard.length} remaining leaderboard records`)
          } catch (e) {
            console.log('[INIT] DEBUG: Error checking leaderboard:', e)
          }
          
          try {
            const remainingOrders = await db.select().from(discordOrders).where(inArray(discordOrders.resourceId, resourceIds))
            console.log(`[INIT] DEBUG: Found ${remainingOrders.length} remaining discordOrders records`)
          } catch (e) {
            console.log('[INIT] DEBUG: Error checking discordOrders:', e)
          }
          
          try {
            const remainingMappings = await db.select().from(resourceDiscordMapping).where(inArray(resourceDiscordMapping.resourceId, resourceIds))
            console.log(`[INIT] DEBUG: Found ${remainingMappings.length} remaining resourceDiscordMapping records`)
          } catch (e) {
            console.log('[INIT] DEBUG: Error checking resourceDiscordMapping:', e)
          }
          
          try {
            const remainingChanges = await db.select().from(websiteChanges).where(inArray(websiteChanges.resourceId, resourceIds))
            console.log(`[INIT] DEBUG: Found ${remainingChanges.length} remaining websiteChanges records`)
          } catch (e) {
            console.log('[INIT] DEBUG: Error checking websiteChanges:', e)
          }
          
          try {
            const remainingLogs = await db.select().from(botActivityLogs).where(inArray(botActivityLogs.resourceId, resourceIds))
            console.log(`[INIT] DEBUG: Found ${remainingLogs.length} remaining botActivityLogs records`)
          } catch (e) {
            console.log('[INIT] DEBUG: Error checking botActivityLogs:', e)
          }
          
          // Log sample resource IDs for debugging
          console.log(`[INIT] DEBUG: Sample resource IDs to delete:`, resourceIds.slice(0, 3))
        }
        
        console.log('[INIT] DEBUG: Attempting to delete resources...')
        const deletedResources = await db.delete(resources)
          .where(eq(resources.guildId, guildId))
          .returning()
        console.log(`[INIT] Deleted ${deletedResources.length} existing resources`)
      } catch (error) {
        console.error('[INIT] Error deleting resources:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[INIT] Full error object:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to delete resources: ${errorMessage}`)
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
      imageUrl: resource.imageUrl || null,
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
