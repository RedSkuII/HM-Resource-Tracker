/**
 * Apply guild_access_roles migration to production Turso database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

async function main() {
  console.log('🔧 Applying guild_access_roles migration to Turso...\n');

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Add the new column
    console.log('Adding guild_access_roles column to guilds table...');
    await db.execute('ALTER TABLE guilds ADD COLUMN guild_access_roles TEXT');
    console.log('✅ Column added successfully\n');
    
    // Verify the change
    console.log('Verifying column exists...');
    const result = await db.execute('PRAGMA table_info(guilds)');
    const hasColumn = result.rows.some(row => row.name === 'guild_access_roles');
    
    if (hasColumn) {
      console.log('✅ Migration verified! guild_access_roles column exists');
      console.log('\nColumn details:');
      const column = result.rows.find(row => row.name === 'guild_access_roles');
      console.log('  Name:', column.name);
      console.log('  Type:', column.type);
      console.log('  Nullable:', column.notnull === 0 ? 'Yes' : 'No');
    } else {
      console.error('❌ Migration failed - column not found');
    }
    
  } catch (error) {
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('✅ Column already exists - migration already applied');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

main().catch(console.error);
