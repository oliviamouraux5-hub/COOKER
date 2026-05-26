require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GEMINI_API_KEY;

const urls = [
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
  `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
];

const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function test() {
  for (const url of urls) {
    try {
      const response = await globalThis.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: "image/png", data: base64Image } },
              { text: "What color is this image? Reply with one word." }
            ]
          }]
        })
      });
      const data = await response.json();
      console.log(`URL: ${url.split('?')[0]} | Status: ${response.status}`);
      if (response.status === 200) {
        console.log("Response:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
        break;
      } else {
        console.log("Error response:", JSON.stringify(data));
      }
    } catch (e) {
      console.log("Fetch failed for:", url, e.message);
    }
  }
}
test();
