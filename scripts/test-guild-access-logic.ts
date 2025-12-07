/**
 * Test has_guild_access logic for all scenarios
 */

// Simulated guild data from database
const guilds = [
  {
    title: "The High Handed Friend",
    leader_id: "144196641610530817",
    guild_access_roles: null,
    guild_officer_roles: null,
    default_role_id: null
  },
  {
    title: "foreheadvcr",
    leader_id: null,
    guild_access_roles: '["1440776286686548140"]',
    guild_officer_roles: null,
    default_role_id: null
  },
  {
    title: "tester1",
    leader_id: "397171121918836736",
    guild_access_roles: null,
    guild_officer_roles: null,
    default_role_id: null
  }
]

// Test users
const users = [
  {
    id: "144196641610530817",
    name: "User1 (leader of High Handed Friend)",
    roles: []
  },
  {
    id: "397171121918836736",
    name: "User2 (leader of tester1)",
    roles: []
  },
  {
    id: "999999999999999999",
    name: "User3 (has access role 1440776286686548140)",
    roles: ["1440776286686548140"]
  },
  {
    id: "888888888888888888",
    name: "User4 (no special access)",
    roles: []
  }
]

function hasGuildAccess(userId: string, userRoles: string[], guildData: any): boolean {
  // Check if user is the guild leader
  if (guildData.leader_id && userId === guildData.leader_id) {
    return true
  }
  
  // Check guild access roles
  if (guildData.guild_access_roles) {
    try {
      const roleIds = JSON.parse(guildData.guild_access_roles)
      if (userRoles.some(role => roleIds.includes(role))) {
        return true
      }
    } catch {}
  }
  
  // Check officer roles
  if (guildData.guild_officer_roles) {
    try {
      const roleIds = JSON.parse(guildData.guild_officer_roles)
      if (userRoles.some(role => roleIds.includes(role))) {
        return true
      }
    } catch {}
  }
  
  // Check default role
  if (guildData.default_role_id) {
    if (userRoles.includes(guildData.default_role_id)) {
      return true
    }
  }
  
  return false
}

console.log("=== GUILD ACCESS TEST ===\n")

for (const user of users) {
  console.log(`\n${user.name} (ID: ${user.id})`)
  console.log(`Roles: [${user.roles.join(", ") || "none"}]`)
  console.log("Can access:")
  
  const accessible = guilds.filter(g => 
    hasGuildAccess(user.id, user.roles, g)
  )
  
  if (accessible.length === 0) {
    console.log("  - NONE (will NOT see any guilds in autocomplete)")
  } else {
    accessible.forEach(g => console.log(`  - ${g.title}`))
  }
}

console.log("\n\n=== EXPECTED BEHAVIOR ===")
console.log("User1: Should see 'The High Handed Friend' (is leader)")
console.log("User2: Should see 'tester1' (is leader)")
console.log("User3: Should see 'foreheadvcr' (has access role)")
console.log("User4: Should see NOTHING (no access)")
