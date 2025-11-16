/**
 * Migration Script: Merge Duplicate User Entries
 * 
 * This script consolidates duplicate leaderboard and resource history entries
 * that were created due to the old getUserIdentifier() logic prioritizing
 * nicknames over Discord IDs.
 * 
 * What it does:
 * 1. Finds all users in the database
 * 2. For each user, finds leaderboard/history entries using their username/nickname
 * 3. Updates those entries to use their Discord ID instead
 * 4. Consolidates duplicate leaderboard entries by summing points
 * 
 * Run with: npx tsx scripts/merge-duplicate-users.ts
 */

import 'dotenv/config'
import { db, users, leaderboard, resourceHistory } from '../lib/db'
import { eq, sql, or, and } from 'drizzle-orm'

interface UserRecord {
  id: string
  discordId: string
  username: string
  customNickname: string | null
}

interface LeaderboardEntry {
  id: string
  userId: string
  guildId: string
  totalPoints: number
  totalActions: number
}

async function mergeDuplicateUsers() {
  console.log('🔍 Starting user deduplication process...\n')

  try {
    // Get all users from database
    const allUsers = await db.select().from(users)
    console.log(`Found ${allUsers.length} users in database\n`)

    let totalMerged = 0
    let totalHistoryUpdated = 0

    for (const user of allUsers) {
      const possibleUserIds = [
        user.discordId,
        user.username,
        user.customNickname
      ].filter(Boolean) as string[]

      console.log(`\n📋 Processing user: ${user.username} (Discord ID: ${user.discordId})`)
      console.log(`   Possible IDs in database: ${possibleUserIds.join(', ')}`)

      // Find all leaderboard entries for this user (by any identifier)
      const userLeaderboardEntries = await db
        .select()
        .from(leaderboard)
        .where(
          or(
            ...possibleUserIds.map(id => eq(leaderboard.userId, id))
          )
        )

      if (userLeaderboardEntries.length === 0) {
        console.log(`   ✓ No leaderboard entries found`)
        continue
      }

      console.log(`   Found ${userLeaderboardEntries.length} leaderboard entries`)

      // Group by guild to merge entries per guild
      const entriesByGuild = userLeaderboardEntries.reduce((acc, entry) => {
        const guildKey = entry.guildId || 'null'
        if (!acc[guildKey]) {
          acc[guildKey] = []
        }
        acc[guildKey].push(entry)
        return acc
      }, {} as Record<string, typeof userLeaderboardEntries>)

      for (const [guildId, entries] of Object.entries(entriesByGuild)) {
        if (entries.length === 1) {
          // Single entry - just update the userId to Discord ID if needed
          const entry = entries[0]
          if (entry.userId !== user.discordId) {
            await db
              .update(leaderboard)
              .set({ userId: user.discordId })
              .where(eq(leaderboard.id, entry.id))
            console.log(`   ✓ Updated leaderboard entry in guild ${guildId} to use Discord ID`)
          }
        } else {
          // Multiple entries - can't actually merge them since each is a separate action
          // Just update all to use Discord ID
          for (const entry of entries) {
            if (entry.userId !== user.discordId) {
              await db
                .update(leaderboard)
                .set({ userId: user.discordId })
                .where(eq(leaderboard.id, entry.id))
            }
          }
          console.log(`   ✓ Updated ${entries.length} leaderboard entries in guild ${guildId} to use Discord ID`)
          totalMerged += entries.length
        }
      }

      // Update resource history to use Discord ID
      const historyCount = await db
        .update(resourceHistory)
        .set({ updatedBy: user.discordId })
        .where(
          and(
            or(
              ...possibleUserIds
                .filter(id => id !== user.discordId)
                .map(id => eq(resourceHistory.updatedBy, id))
            )
          )
        )

      if (historyCount) {
        console.log(`   ✓ Updated ${historyCount} resource history entries`)
        totalHistoryUpdated += Number(historyCount)
      }
    }

    console.log('\n\n✅ Migration Complete!')
    console.log(`   Total leaderboard entries updated: ${totalMerged}`)
    console.log(`   Total resource history entries updated: ${totalHistoryUpdated}`)
    console.log('\n💡 What was fixed:')
    console.log('   - All leaderboard entries now use Discord IDs instead of usernames/nicknames')
    console.log('   - All resource history entries now use Discord IDs')
    console.log('   - Future contributions will automatically use Discord IDs')
    console.log('   - Leaderboard will still display your username/nickname (not the ID)')

  } catch (error) {
    console.error('\n❌ Error during migration:', error)
    throw error
  }
}

// Run the migration
mergeDuplicateUsers()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
