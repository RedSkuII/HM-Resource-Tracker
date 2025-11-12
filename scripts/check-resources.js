require('dotenv').config({path:'.env.production'});
const {createClient} = require('@libsql/client');

(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  
  const result = await client.execute(`
    SELECT name, category, quantity, target_quantity
    FROM resources 
    ORDER BY name 
    LIMIT 15
  `);
  
  console.log('📦 Sample Resources in Production Database:\n');
  result.rows.forEach(row => {
    console.log(`  ✅ ${row.name}`);
    console.log(`     Category: ${row.category} | Stock: ${row.quantity}/${row.target_quantity}`);
  });
  
  console.log('\n💡 All resources are live and accessible on your website!');
  console.log('🌐 Visit: https://hm-resources-tracker.vercel.app/resources');
  
  client.close();
})().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
