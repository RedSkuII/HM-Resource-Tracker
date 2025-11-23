const fs = require('fs');

const file = fs.readFileSync('./app/api/guilds/initialize/route.ts', 'utf8');
const imageUrls = JSON.parse(fs.readFileSync('./image-urls.json', 'utf8'));

// Extract each resource definition
const lines = file.split('\n');
const newLines = [];
let inArray = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect start of array
  if (line.includes('const STANDARD_RESOURCES = [')) {
    newLines.push(line);
    inArray = true;
    continue;
  }
  
  // Detect end of array
  if (inArray && line.trim() === ']') {
    newLines.push(line);
    inArray = false;
    continue;
  }
  
  // Process lines within the array
  if (inArray && line.includes("{ name: '")) {
    const nameMatch = line.match(/name: '([^']+)'/);
    if (nameMatch) {
      const resourceName = nameMatch[1];
      const imageUrl = imageUrls[resourceName];
      
      if (imageUrl) {
        // Check if line already has imageUrl
        if (line.includes('imageUrl:')) {
          // Replace existing imageUrl
          const updated = line.replace(/imageUrl: '[^']*'/, `imageUrl: '${imageUrl}'`);
          newLines.push(updated);
        } else {
          // Add imageUrl before multiplier
          const updated = line.replace(/, multiplier:/, `, imageUrl: '${imageUrl}', multiplier:`);
          newLines.push(updated);
        }
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync('./app/api/guilds/initialize/route.ts', newLines.join('\n'), 'utf8');
console.log('✅ Successfully added image URLs to all 95 resources');
