import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config({ path: '.env.local' });

async function fixCompletedOrders() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('\n🔧 Checking for completed orders with pending status...\n');
    
    // Find orders where status is pending but they're actually complete
    // We'll mark all pending orders for Advanced Machinery as fulfilled since the screenshot shows it's complete
    const result = await client.execute({
      sql: `UPDATE discord_orders 
            SET status = 'fulfilled',
                fulfilled_at = ?
            WHERE resource_name = 'Advanced Machinery' 
            AND status = 'pending'`,
      args: [Math.floor(Date.now() / 1000)],
    });

    console.log(`✅ Updated ${result.rowsAffected} order(s) to fulfilled status\n`);
    
    // Show current orders
    const orders = await client.execute({
      sql: `SELECT id, resource_name, quantity, status, created_at 
            FROM discord_orders 
            WHERE resource_name = 'Advanced Machinery'
            ORDER BY created_at DESC 
            LIMIT 5`,
      args: [],
    });

    if (orders.rows.length > 0) {
      console.log('Recent Advanced Machinery orders:');
      orders.rows.forEach((row: any) => {
        const date = new Date(row.created_at * 1000).toLocaleString();
        console.log(`  - ${row.status.toUpperCase()}: ${row.quantity} units (${date})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.close();
  }
}

fixCompletedOrders();
