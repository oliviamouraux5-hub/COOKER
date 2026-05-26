const fs = require('fs');
const path = require('path');

const overviewPath = '/Users/oliviamouraux/.gemini/antigravity/brain/75dfaab4-583d-4a86-abc8-dcbc8f20787e/.system_generated/logs/overview.txt';

try {
  const content = fs.readFileSync(overviewPath, 'utf8');
  console.log('Read overview file of size:', content.length);
  
  // Let's split by lines
  const lines = content.split('\n');
  console.log('Total lines in overview:', lines.length);
  
  // Let's find all lines containing "dashboard/page.tsx" or "view_file" on page.tsx
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('dashboard/page.tsx') && line.includes('view_file')) {
      console.log(`Line ${i} has dashboard/page.tsx view_file`);
      // Let's print out the first 1000 characters of this line
      console.log(line.substring(0, 1000));
    }
  }
} catch (err) {
  console.error('Error:', err);
}
