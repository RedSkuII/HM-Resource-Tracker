require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL?.replace(/"/g, '');
const authToken = process.env.TURSO_AUTH_TOKEN?.replace(/"/g, '');

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

async function addDefaultRoleColumn() {
  try {
    console.log('🔄 Adding default_role_id column to guilds table...');
    
    await client.execute(`
      ALTER TABLE guilds ADD COLUMN default_role_id TEXT
    `);
    
    console.log('✅ Successfully added default_role_id column to guilds table');
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

addDefaultRoleColumn();
