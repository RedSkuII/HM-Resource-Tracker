// Script to add a role to a guild's access roles
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function addRoleToGuild() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const guildId = 'house-melange';
  const newRoleId = '1361291676923986011'; // foreheadvcr's role

  try {
    // Get current guild data
    const result = await client.execute({
      sql: 'SELECT guildAccessRoles FROM guilds WHERE id = ?',
      args: [guildId]
    });

    if (result.rows.length === 0) {
      console.log(`Guild ${guildId} not found`);
      return;
    }

    const currentRoles = result.rows[0].guildAccessRoles;
    console.log('Current guildAccessRoles:', currentRoles);

    let rolesArray = [];
    if (currentRoles) {
      rolesArray = JSON.parse(currentRoles);
    }

    // Add new role if not already present
    if (!rolesArray.includes(newRoleId)) {
      rolesArray.push(newRoleId);
      console.log('Adding role:', newRoleId);
    } else {
      console.log('Role already exists');
      return;
    }

    // Update guild
    await client.execute({
      sql: 'UPDATE guilds SET guildAccessRoles = ? WHERE id = ?',
      args: [JSON.stringify(rolesArray), guildId]
    });

    console.log('✓ Successfully updated house-melange guildAccessRoles to:', JSON.stringify(rolesArray));
    
    // Verify
    const verify = await client.execute({
      sql: 'SELECT id, title, guildAccessRoles FROM guilds WHERE id = ?',
      args: [guildId]
    });
    console.log('Verified:', verify.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  }

  client.close();
}

addRoleToGuild();
