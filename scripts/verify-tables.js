require('dotenv').config({path:'.env.production'});
const {createClient} = require('@libsql/client');

(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  
  const result = await client.execute(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);
  
  console.log('📋 Production Database Tables:');
  result.rows.forEach(row => {
    console.log(`  ✅ ${row.name}`);
  });
  
  client.close();
})().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
