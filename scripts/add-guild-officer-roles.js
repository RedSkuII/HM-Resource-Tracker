require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL?.replace(/"/g, '');
const authToken = process.env.TURSO_AUTH_TOKEN?.replace(/"/g, '');

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

async function addGuildOfficerRolesColumn() {
  try {
    console.log('🔄 Adding guild_officer_roles column to guilds table...');
    
    await client.execute(`
      ALTER TABLE guilds ADD COLUMN guild_officer_roles TEXT
    `);
    
    console.log('✅ Successfully added guild_officer_roles column to guilds table');
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('ℹ️ Column already exists');
    } else {
      console.error('❌ Error adding column:', error);
      throw error;
    }
  } finally {
    await client.close();
  }
}

addGuildOfficerRolesColumn();
