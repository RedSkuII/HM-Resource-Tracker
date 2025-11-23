const fs = require('fs');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  
  const result = await client.execute({
    sql: `SELECT name, category, description, icon, image_url 
          FROM resources 
          WHERE guild_id = ? 
          ORDER BY name`,
    args: ['house-melange']
  });
  
  // Generate TypeScript array
  let output = '// Standard 95 resources template (Dune: Awakening)\nconst STANDARD_RESOURCES = [\n';
  
  result.rows.forEach((row, index) => {
    const name = row.name.replace(/'/g, "\\'");
    const desc = (row.description || '').replace(/'/g, "\\'");
    const category = row.category || 'Components';
    const icon = row.icon || '🔧';
    const imageUrl = row.image_url || '';
    
    output += `  { name: '${name}', category: '${category}', description: '${desc}', icon: '${icon}', multiplier: 1.0`;
    if (imageUrl) {
      output += `, imageUrl: '${imageUrl}'`;
    }
    output += ' }';
    if (index < result.rows.length - 1) output += ',';
    output += '\n';
  });
  
  output += ']\n';
  
  fs.writeFileSync('standard-resources-with-images.txt', output);
  console.log('✅ Generated standard-resources-with-images.txt with ' + result.rows.length + ' resources');
  client.close();
})();
