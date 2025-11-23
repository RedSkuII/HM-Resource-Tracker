const fs = require('fs');

// Read the current initialize route file
const filePath = './app/api/guilds/initialize/route.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Read the image URLs mapping
const imageUrls = JSON.parse(fs.readFileSync('./image-urls.json', 'utf8'));

// Find the STANDARD_RESOURCES array
const startMarker = '// Standard 95 resources template (Dune: Awakening)\nconst STANDARD_RESOURCES = [';
const endMarker = ']\n\n/**\n * POST /api/guilds/initialize';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find STANDARD_RESOURCES array');
  process.exit(1);
}

// Extract the array content
const arrayContent = content.substring(startIndex + startMarker.length, endIndex);

// Parse and update each resource
const updatedLines = [];
const lines = arrayContent.split('\n').filter(l => l.trim());

for (const line of lines) {
  if (line.includes('{ name:')) {
    // Extract resource name
    const nameMatch = line.match(/name: '([^']+)'/);
    if (nameMatch) {
      const resourceName = nameMatch[1];
      const imageUrl = imageUrls[resourceName];
      
      // Check if imageUrl already exists in the line
      if (line.includes('imageUrl:')) {
        // Replace existing imageUrl
        const updated = line.replace(/imageUrl: '[^']*'/, `imageUrl: '${imageUrl}'`);
        updatedLines.push(updated);
      } else {
        // Add imageUrl before the closing brace
        const updated = line.replace(' },', `, imageUrl: '${imageUrl}' },`).replace(' }', `, imageUrl: '${imageUrl}' }`);
        updatedLines.push(updated);
      }
    } else {
      updatedLines.push(line);
    }
  } else if (line.trim()) {
    updatedLines.push(line);
  }
}

// Reconstruct the file
const newContent = content.substring(0, startIndex) + 
  startMarker + '\n' + 
  updatedLines.join('\n') + '\n' +
  content.substring(endIndex);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Updated all 95 resources with image URLs');
