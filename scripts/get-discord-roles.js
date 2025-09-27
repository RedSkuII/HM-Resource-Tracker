#!/usr/bin/env node

/**
 * Helper script to get Discord role IDs and configure permissions
 * 
 * Usage:
 * 1. Run this script to see your current role configuration
 * 2. Get role IDs from Discord (Right-click role → Copy ID)
 * 3. Update your .env.local file with the correct role IDs
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔐 Discord Role Permission Configuration Helper\n')

// Parse current configuration
let currentConfig = []
try {
  const roleConfig = process.env.DISCORD_ROLES_CONFIG
  if (roleConfig) {
    currentConfig = JSON.parse(roleConfig)
  }
} catch (error) {
  console.error('❌ Error parsing DISCORD_ROLES_CONFIG:', error.message)
}

console.log('📋 Current Role Configuration:')
console.log('=' .repeat(50))

if (currentConfig.length === 0) {
  console.log('⚠️  No roles configured - all users will have full access!')
} else {
  currentConfig.forEach((role, index) => {
    console.log(`${index + 1}. ${role.name} (ID: ${role.id})`)
    console.log(`   Level: ${role.level}`)
    console.log(`   Permissions:`)
    console.log(`   - Resource Access: ${role.canAccessResources ? '✅' : '❌'}`)
    console.log(`   - Admin Access: ${role.isAdmin ? '✅' : '❌'}`)
    console.log(`   - Edit Targets: ${role.canEditTargets ? '✅' : '❌'}`)
    console.log(`   - View Reports: ${role.canViewReports ? '✅' : '❌'}`)
    console.log(`   - Manage Users: ${role.canManageUsers ? '✅' : '❌'}`)
    console.log(`   - Export Data: ${role.canExportData ? '✅' : '❌'}`)
    console.log()
  })
}

console.log('🎯 How to Configure Roles:')
console.log('=' .repeat(50))
console.log('1. Enable Developer Mode in Discord (User Settings → Advanced)')
console.log('2. Go to your guild → Server Settings → Roles')
console.log('3. Right-click each role → Copy ID')
console.log('4. Replace the placeholder IDs in your .env.local file')
console.log()

console.log('📝 Example Role Configuration:')
console.log('=' .repeat(50))
const exampleConfig = [
  {
    id: "123456789012345678", // Replace with actual role ID
    name: "Guild Leader",
    level: 100,
    isAdmin: true,
    canEditTargets: true,
    canAccessResources: true,
    canViewReports: true,
    canManageUsers: true,
    canExportData: true
  },
  {
    id: "987654321098765432", // Replace with actual role ID
    name: "Officer",
    level: 50,
    isAdmin: true,
    canEditTargets: true,
    canAccessResources: true,
    canViewReports: true
  },
  {
    id: "555666777888999000", // Replace with actual role ID
    name: "Member",
    level: 10,
    canAccessResources: true
  },
  {
    id: "111222333444555666", // Replace with @everyone role ID
    name: "@everyone",
    level: 1
    // No permissions = read-only access
  }
]

console.log(JSON.stringify(exampleConfig, null, 2))
console.log()

console.log('🔧 To update your configuration:')
console.log('Edit .env.local and update DISCORD_ROLES_CONFIG with your role IDs')
console.log()

console.log('🚀 After updating:')
console.log('1. Restart your development server')
console.log('2. Test permissions by logging in with different Discord accounts')