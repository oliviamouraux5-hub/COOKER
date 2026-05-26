const fs = require('fs');
const path = require('path');

const pbPath = '/Users/oliviamouraux/.gemini/antigravity/conversations/94708f50-143e-4648-891e-3d4228c28d03.pb';

try {
  const buffer = fs.readFileSync(pbPath);
  console.log('Read pb file as Buffer, length:', buffer.length);
  
  // Let's search for "toggleRestockItem"
  const idx = buffer.indexOf('toggleRestockItem');
  if (idx !== -1) {
    console.log('Found toggleRestockItem at index:', idx);
    // Let's print some chars around it
    console.log(buffer.toString('utf8', Math.max(0, idx - 500), Math.min(buffer.length, idx + 2000)));
  } else {
    console.log('toggleRestockItem not found in binary Buffer.');
  }

  // Let's search for "fridgeItemQuantity"
  const idx2 = buffer.indexOf('fridgeItemQuantity');
  if (idx2 !== -1) {
    console.log('Found fridgeItemQuantity at index:', idx2);
    console.log(buffer.toString('utf8', Math.max(0, idx2 - 500), Math.min(buffer.length, idx2 + 2000)));
  } else {
    console.log('fridgeItemQuantity not found.');
  }
} catch (err) {
  console.error('Error:', err);
}
