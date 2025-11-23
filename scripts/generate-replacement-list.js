const fs = require('fs');

const imageUrls = JSON.parse(fs.readFileSync('./image-urls.json', 'utf8'));

// Generate multi_replace operations
const replacements = [];

for (const [name, url] of Object.entries(imageUrls)) {
  replacements.push({
    find: `{ name: '${name.replace(/'/g, "\\'")}',`,
    imageUrl: url
  });
}

// Output for manual updates
console.log(`Total resources with images: ${replacements.length}\n`);
console.log('Add , imageUrl: \'URL\' before multiplier: 1.0 for each resource\n');

replacements.forEach(r => {
  console.log(`Resource: ${r.find.match(/name: '([^']+)'/)[1]}`);
  console.log(`imageUrl: '${r.imageUrl}',\n`);
});
