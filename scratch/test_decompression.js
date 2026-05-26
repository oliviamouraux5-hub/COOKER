const fs = require('fs');
const zlib = require('zlib');

const pbPath = '/Users/oliviamouraux/.gemini/antigravity/conversations/94708f50-143e-4648-891e-3d4228c28d03.pb';

try {
  const buffer = fs.readFileSync(pbPath);
  console.log('Read pb file of size:', buffer.length);
  
  // Try gunzip
  try {
    const unzipped = zlib.gunzipSync(buffer);
    console.log('Successfully gunzipped! Uncompressed size:', unzipped.length);
    fs.writeFileSync('/Users/oliviamouraux/fridge/scratch/decompressed.pb', unzipped);
  } catch (e) {
    console.log('Gunzip failed:', e.message);
  }
  
  // Try inflate
  try {
    const inflated = zlib.inflateSync(buffer);
    console.log('Successfully inflated! Uncompressed size:', inflated.length);
    fs.writeFileSync('/Users/oliviamouraux/fridge/scratch/decompressed.pb', inflated);
  } catch (e) {
    console.log('Inflate failed:', e.message);
  }
  
  // Try inflateRaw
  try {
    const inflatedRaw = zlib.inflateRawSync(buffer);
    console.log('Successfully inflatedRaw! Uncompressed size:', inflatedRaw.length);
    fs.writeFileSync('/Users/oliviamouraux/fridge/scratch/decompressed.pb', inflatedRaw);
  } catch (e) {
    console.log('InflateRaw failed:', e.message);
  }
  
  // Try brotliDecompress
  try {
    const brotli = zlib.brotliDecompressSync(buffer);
    console.log('Successfully brotli decompressed! Uncompressed size:', brotli.length);
    fs.writeFileSync('/Users/oliviamouraux/fridge/scratch/decompressed.pb', brotli);
  } catch (e) {
    console.log('Brotli failed:', e.message);
  }
} catch (err) {
  console.error('Error:', err);
}
