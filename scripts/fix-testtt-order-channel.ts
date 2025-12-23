import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config({ path: '.env.local' });

async function fixOrderChannel() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // First check current state
    console.log('\n📋 Checking guilds without order channels...\n');
    const guilds = await client.execute({
      sql: `SELECT id, title, discord_order_channel_id FROM guilds WHERE title IN ('testtt', 'tester121')`,
      args: [],
    });

    console.log('Current state:');
    guilds.rows.forEach((row: any) => {
      console.log(`  ${row.title}: order_channel = ${row.discord_order_channel_id || 'NULL'}`);
    });

    // Update testtt with the channel ID
    console.log('\n🔧 Updating testtt order channel...\n');
    await client.execute({
      sql: `UPDATE guilds SET discord_order_channel_id = ? WHERE title = ?`,
      args: ['1450840719118958694', 'testtt'],
    });

    // Update tester121 with the channel ID
    console.log('🔧 Updating tester121 order channel...\n');
    await client.execute({
      sql: `UPDATE guilds SET discord_order_channel_id = ? WHERE title = ?`,
      args: ['1450837626725732513', 'tester121'],
    });

    // Verify the updates
    console.log('✅ Verification:\n');
    const updated = await client.execute({
      sql: `SELECT id, title, discord_order_channel_id FROM guilds WHERE title IN ('testtt', 'tester121')`,
      args: [],
    });

    updated.rows.forEach((row: any) => {
      console.log(`  ${row.title}: order_channel = ${row.discord_order_channel_id}`);
    });

    console.log('\n✅ Order channels updated successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.close();
  }
}

fixOrderChannel();
