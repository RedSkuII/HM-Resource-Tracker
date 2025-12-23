import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config({ path: '.env.local' });

async function checkGuilds() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('\n📋 Checking all guilds in database...\n');
    const guilds = await client.execute({
      sql: `SELECT id, title, discord_guild_id FROM guilds ORDER BY created_at DESC`,
      args: [],
    });

    if (guilds.rows.length === 0) {
      console.log('No guilds found in database.\n');
    } else {
      console.log(`Found ${guilds.rows.length} guild(s):\n`);
      guilds.rows.forEach((row: any) => {
        console.log(`  - ${row.title} (DB ID: ${row.id}, Discord: ${row.discord_guild_id})`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.close();
  }
}

checkGuilds();
