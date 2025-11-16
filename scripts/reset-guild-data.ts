/**
 * Reset Guild Data Script
 * 
 * This script resets all data for specified guilds:
 * - Deletes all resource history entries
 * - Deletes all leaderboard entries
 * - Resets all resource quantities to 0
 * - Optionally deletes and recreates resources with standard set
 * 
 * Usage: npm run reset-guild-data
 */

import { db, resources, resourceHistory, leaderboard } from '../lib/db'
import { eq, and } from 'drizzle-orm'

const GUILDS_TO_RESET = ['house-melange', 'whitelist-second-guild']

async function resetGuildData() {
  console.log('🔄 Starting guild data reset...\n')

  for (const guildId of GUILDS_TO_RESET) {
    console.log(`\n📋 Processing guild: ${guildId}`)
    console.log('─'.repeat(50))

    try {
      // 1. Delete all resource history for this guild
      console.log(`\n🗑️  Deleting resource history for ${guildId}...`)
      const historyDeleted = await db.delete(resourceHistory)
        .where(eq(resourceHistory.guildId, guildId))
        .returning()
      console.log(`   ✅ Deleted ${historyDeleted.length} history entries`)

      // 2. Delete all leaderboard entries for this guild
      console.log(`\n🗑️  Deleting leaderboard entries for ${guildId}...`)
      const leaderboardDeleted = await db.delete(leaderboard)
        .where(eq(leaderboard.guildId, guildId))
        .returning()
      console.log(`   ✅ Deleted ${leaderboardDeleted.length} leaderboard entries`)

      // 3. Reset all resource quantities to 0 (keep resources, just zero them out)
      console.log(`\n🔄 Resetting resource quantities for ${guildId}...`)
      const resourcesUpdated = await db.update(resources)
        .set({ 
          quantity: 0,
          lastUpdatedBy: 'system-reset',
          updatedAt: new Date()
        })
        .where(eq(resources.guildId, guildId))
        .returning()
      console.log(`   ✅ Reset ${resourcesUpdated.length} resources to 0 quantity`)

      console.log(`\n✅ Successfully reset all data for ${guildId}`)

    } catch (error) {
      console.error(`\n❌ Error resetting guild ${guildId}:`, error)
      throw error
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Guild data reset complete!')
  console.log('='.repeat(50))
  
  console.log('\n📊 Summary:')
  console.log(`   - Guilds processed: ${GUILDS_TO_RESET.length}`)
  console.log(`   - All resource history deleted`)
  console.log(`   - All leaderboard entries deleted`)
  console.log(`   - All resource quantities reset to 0`)
  console.log('\n💡 Resources still exist but have 0 quantity')
  console.log('💡 Users can now start fresh with clean leaderboards')
}

// Run the reset
resetGuildData()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
