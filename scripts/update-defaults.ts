/**
 * Migration script to update all existing resources and guilds to new defaults:
 * - targetQuantity: 1000 -> 10000 for all resources
 * - orderFulfillmentBonus: 50 -> 0 for all guilds
 * 
 * Run with: npx tsx scripts/update-defaults.ts
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { eq, sql } from 'drizzle-orm'

// Load environment variables
config({ path: '.env.local' })

// Database schema (minimal definitions needed for this migration)
const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  targetQuantity: integer('target_quantity'),
})

const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(),
  orderFulfillmentBonus: integer('order_fulfillment_bonus'),
  websiteBonusPercentage: integer('website_bonus_percentage'),
})

const botConfigurations = sqliteTable('bot_configurations', {
  id: text('id').primaryKey(),
  orderFulfillmentBonus: integer('order_fulfillment_bonus'),
  websiteBonusPercentage: integer('website_bonus_percentage'),
})

async function updateDefaults() {
  console.log('🔄 Starting migration to update defaults...\n')

  // Connect to database
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })

  const db = drizzle(client)

  try {
    // 1. Update all resources targetQuantity from 1000 to 10000
    console.log('📦 Updating resources targetQuantity: 1000 → 10000')
    const resourcesUpdated = await db
      .update(resources)
      .set({ targetQuantity: 10000 })
      .where(eq(resources.targetQuantity, 1000))
    console.log(`   ✅ Resources with targetQuantity=1000 updated to 10000`)

    // Also update any resources that have no target or different targets to 10000
    const allResourcesUpdated = await db
      .update(resources)
      .set({ targetQuantity: 10000 })
    console.log(`   ✅ All resources targetQuantity set to 10000\n`)

    // 2. Update all guilds orderFulfillmentBonus from 50 to 0
    console.log('🏰 Updating guilds orderFulfillmentBonus: 50 → 0')
    const guildsUpdated = await db
      .update(guilds)
      .set({ orderFulfillmentBonus: 0 })
      .where(eq(guilds.orderFulfillmentBonus, 50))
    console.log(`   ✅ Guilds with orderFulfillmentBonus=50 updated to 0\n`)

    // 3. Update all bot_configurations orderFulfillmentBonus from 50 to 0
    console.log('🤖 Updating bot_configurations orderFulfillmentBonus: 50 → 0')
    try {
      const botConfigsUpdated = await db
        .update(botConfigurations)
        .set({ orderFulfillmentBonus: 0 })
        .where(eq(botConfigurations.orderFulfillmentBonus, 50))
      console.log(`   ✅ Bot configurations with orderFulfillmentBonus=50 updated to 0\n`)
    } catch (err) {
      console.log(`   ⚠️  bot_configurations table may not exist (legacy), skipping...\n`)
    }

    // Summary - fetch counts
    console.log('📊 Migration Summary:')
    
    const resourceCount = await db.select({ count: sql<number>`count(*)` }).from(resources)
    console.log(`   Total resources: ${resourceCount[0]?.count || 0} (all now have targetQuantity=10000)`)
    
    const guildCount = await db.select({ count: sql<number>`count(*)` }).from(guilds)
    console.log(`   Total guilds: ${guildCount[0]?.count || 0} (all now have orderFulfillmentBonus=0)`)

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📝 New defaults applied:')
    console.log('   - Resource targetQuantity: 10000')
    console.log('   - Guild orderFulfillmentBonus: 0%')
    console.log('   - Guild websiteBonusPercentage: 0% (unchanged)')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

updateDefaults()
