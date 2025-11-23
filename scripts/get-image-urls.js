const { createClient } = require('@libsql/client');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

client.execute({
  sql: 'SELECT name, image_url FROM resources WHERE guild_id = ? ORDER BY name',
  args: ['house-melange']
}).then(result => {
  const imageMap = {};
  result.rows.forEach(row => {
    if (row.image_url) {
      imageMap[row.name] = row.image_url;
    }
  });
  
  fs.writeFileSync('image-urls.json', JSON.stringify(imageMap, null, 2));
  console.log(`✅ Exported ${Object.keys(imageMap).length} image URLs to image-urls.json`);
  
  client.close();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
