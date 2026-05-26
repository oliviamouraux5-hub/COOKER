const fs = require('fs');
const csv = require('csv-parser');

const CSV_FILE = 'recipes_data.csv';
const TARGET_COUNT = 2000;
const eliteRecipes = [];

console.log('Curating the Elite 2,000 Recipes...');

fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on('data', (row) => {
    if (eliteRecipes.length >= TARGET_COUNT) return;

    try {
      const ingredients = JSON.parse(row.ingredients.replace(/'/g, '"'));
      const directions = JSON.parse(row.directions.replace(/'/g, '"'));

      // High Quality Filter:
      // - Must have 5+ ingredients
      // - Must have 5+ steps
      // - Short Title (better for UI)
      if (row.title && row.title.length < 30 && ingredients.length >= 5 && directions.length >= 5) {
        eliteRecipes.push({
          id: `elite-${eliteRecipes.length}`,
          title: row.title,
          ingredients: ingredients.map(item => ({ item, qty: "" })),
          instructions: directions,
          ner_ingredients: JSON.parse(row.NER.replace(/'/g, '"')),
          is_ai_generated: false,
          source: row.site || 'Elite Library'
        });
      }
    } catch (e) {}
  })
  .on('end', () => {
    fs.writeFileSync('./src/lib/data/elite_recipes.json', JSON.stringify(eliteRecipes));
    console.log(`\nDone! Saved ${eliteRecipes.length} Elite Recipes.`);
  });
