#!/usr/bin/env node

/**
 * Interactive Discord Role Configuration Setup
 * This script helps you configure Discord role permissions for your ResourceTracker
 */

const readline = require('readline')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function main() {
  console.log('🔐 Discord Role Configuration Setup')
  console.log('====================================\n')
  
  console.log('This script will help you configure role-based permissions for your ResourceTracker.')
  console.log('You\'ll need Discord role IDs from your server.\n')
  
  console.log('📋 How to get Discord Role IDs:')
  console.log('1. Enable Developer Mode in Discord (User Settings → Advanced)')
  console.log('2. Go to your Discord server → Server Settings → Roles')
  console.log('3. Right-click any role → Copy ID')
  console.log('4. The ID will be an 18-digit number like: 123456789012345678\n')
  
  const proceed = await askQuestion('Ready to configure roles? (y/n): ')
  if (proceed.toLowerCase() !== 'y') {
    console.log('Setup cancelled.')
    rl.close()
    return
  }
  
  console.log('\n🎯 Let\'s configure your roles:\n')
  
  const roles = []
  
  // Admin role
  console.log('👑 ADMIN ROLE (Full permissions - can create/edit/delete resources):')
  const adminId = await askQuestion('Enter your admin/owner role ID: ')
  const adminName = await askQuestion('Enter admin role name (e.g., "Guild Leader", "Admin"): ')
  
  if (adminId && adminName) {
    roles.push({
      id: adminId.trim(),
      name: adminName.trim(),
      level: 100,
      isAdmin: true,
      canEditTargets: true,
      canAccessResources: true,
      canViewReports: true,
      canManageUsers: true,
      canExportData: true
    })
  }
  
  // Officer role
  console.log('\n⭐ OFFICER ROLE (Can edit resources and targets):')
  const officerYes = await askQuestion('Do you have an officer/moderator role? (y/n): ')
  
  if (officerYes.toLowerCase() === 'y') {
    const officerId = await askQuestion('Enter officer role ID: ')
    const officerName = await askQuestion('Enter officer role name (e.g., "Officer", "Moderator"): ')
    
    if (officerId && officerName) {
      roles.push({
        id: officerId.trim(),
        name: officerName.trim(),
        level: 50,
        isAdmin: true,
        canEditTargets: true,
        canAccessResources: true,
        canViewReports: true
      })
    }
  }
  
  // Member role
  console.log('\n👥 MEMBER ROLE (Can view and update resource quantities):')
  const memberYes = await askQuestion('Do you have a member role? (y/n): ')
  
  if (memberYes.toLowerCase() === 'y') {
    const memberId = await askQuestion('Enter member role ID: ')
    const memberName = await askQuestion('Enter member role name (e.g., "Member", "Guild Member"): ')
    
    if (memberId && memberName) {
      roles.push({
        id: memberId.trim(),
        name: memberName.trim(),
        level: 10,
        canAccessResources: true
      })
    }
  }
  
  // Everyone role
  console.log('\n🌍 @EVERYONE ROLE (Basic access):')
  const everyoneYes = await askQuestion('Allow @everyone basic read access? (y/n): ')
  
  if (everyoneYes.toLowerCase() === 'y') {
    const everyoneId = await askQuestion('Enter your @everyone role ID (same as your server ID): ')
    
    if (everyoneId) {
      roles.push({
        id: everyoneId.trim(),
        name: "@everyone",
        level: 1
        // No permissions = read-only access
      })
    }
  }
  
  if (roles.length === 0) {
    console.log('\n⚠️  No roles configured. Users will have full access by default.')
    rl.close()
    return
  }
  
  console.log('\n📋 Your Role Configuration:')
  console.log('==========================')
  roles.forEach((role, index) => {
    console.log(`${index + 1}. ${role.name} (ID: ${role.id})`)
    console.log(`   Level: ${role.level}`)
    console.log(`   Admin: ${role.isAdmin ? '✅' : '❌'}`)
    console.log(`   Edit Targets: ${role.canEditTargets ? '✅' : '❌'}`)
    console.log(`   Resource Access: ${role.canAccessResources ? '✅' : '❌'}`)
    console.log()
  })
  
  const confirm = await askQuestion('Save this configuration? (y/n): ')
  
  if (confirm.toLowerCase() === 'y') {
    // Generate the JSON configuration
    const rolesJson = JSON.stringify(roles)
    
    // Read current .env.local
    const envPath = path.join(process.cwd(), '.env.local')
    let envContent = fs.readFileSync(envPath, 'utf8')
    
    // Update the DISCORD_ROLES_CONFIG line
    const roleConfigRegex = /^DISCORD_ROLES_CONFIG=.*$/m
    if (roleConfigRegex.test(envContent)) {
      envContent = envContent.replace(roleConfigRegex, `DISCORD_ROLES_CONFIG="${rolesJson}"`)
    } else {
      envContent += `\nDISCORD_ROLES_CONFIG="${rolesJson}"\n`
    }
    
    // Write back to file
    fs.writeFileSync(envPath, envContent)
    
    console.log('\n✅ Configuration saved to .env.local!')
    console.log('\n🚀 Next steps:')
    console.log('1. Restart your development server')
    console.log('2. Test by logging in with different Discord accounts')
    console.log('3. Check the console for any role-related warnings')
    
  } else {
    console.log('\n❌ Configuration not saved.')
  }
  
  rl.close()
}

main().catch(console.error)