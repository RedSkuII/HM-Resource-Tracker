// Run migration 0012: Add in_game_guild_id column
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runMigration() {
  try {
    console.log('Connecting to Turso database...');
    
    // Read migration SQL
    const migrationSQL = readFileSync(
      join(__dirname, '..', 'drizzle', '0012_add_in_game_guild_id.sql'),
      'utf8'
    );
    
    console.log('Running migration 0012...');
    console.log(migrationSQL);
    
    await client.execute(migrationSQL);
    
    console.log('✅ Migration 0012 completed successfully!');
    
    // Verify the column exists
    const result = await client.execute(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='bot_configurations'
    `);
    
    console.log('\nUpdated table schema:');
    console.log(result.rows[0]?.sql || 'No result');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigration();
