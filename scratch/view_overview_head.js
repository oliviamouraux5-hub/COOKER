const fs = require('fs');
const overviewPath = '/Users/oliviamouraux/.gemini/antigravity/brain/75dfaab4-583d-4a86-abc8-dcbc8f20787e/.system_generated/logs/overview.txt';

try {
  const content = fs.readFileSync(overviewPath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    console.log(`Line ${i}:`, lines[i].substring(0, 200));
  }
} catch (err) {
  console.error(err);
}
