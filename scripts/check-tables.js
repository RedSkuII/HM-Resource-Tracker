// Check what tables exist in the database
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('Database URL:', process.env.TURSO_DATABASE_URL);

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkTables() {
  try {
    console.log('Checking database tables...\n');
    
    const result = await client.execute(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table'
      ORDER BY name
    `);
    
    console.log(`Found ${result.rows.length} tables:\n`);
    
    for (const row of result.rows) {
      console.log(`Table: ${row.name}`);
      if (row.name === 'bot_configurations') {
        console.log('Schema:', row.sql);
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkTables();
