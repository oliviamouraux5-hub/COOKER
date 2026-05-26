const { scanFridgeWithGemini } = require('./src/lib/actions/recipes');

// Let's call it with a fake image
const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function test() {
  console.log("Calling action...");
  // Note: scanFridgeWithGemini expects base64 without prefix
  const res = await scanFridgeWithGemini(base64Image, "image/png");
  console.log("Result:", res);
}
test();
