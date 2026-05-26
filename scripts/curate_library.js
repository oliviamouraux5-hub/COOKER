const fs = require('fs');
const csv = require('csv-parser');

const CSV_FILE = 'recipes_data.csv';
const TARGET_COUNT = 10000;
const curatedRecipes = [];

console.log('Curating the Top 10,000 Gourmet Recipes...');

fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on('data', (row) => {
    if (curatedRecipes.length >= TARGET_COUNT) return;

    try {
      const ingredients = JSON.parse(row.ingredients.replace(/'/g, '"'));
      const directions = JSON.parse(row.directions.replace(/'/g, '"'));
      const ner = JSON.parse(row.NER.replace(/'/g, '"'));

      // Quality Filter:
      // 1. Must have title
      // 2. Must have at least 3 ingredients
      // 3. Must have at least 3 steps
      // 4. Instructions must be detailed (not just 1 word)
      if (row.title && 
          ingredients.length >= 3 && 
          directions.length >= 3 &&
          directions[0].length > 10) {
        
        curatedRecipes.push({
          id: `lib-${curatedRecipes.length}`,
          title: row.title,
          ingredients: ingredients.map(item => ({ item, qty: "" })),
          instructions: directions,
          ner_ingredients: ner,
          difficulty: 'Intermediate',
          prep_time: 30,
          is_ai_generated: false,
          source: row.site || 'Gourmet Library'
        });

        if (curatedRecipes.length % 1000 === 0) {
          process.stdout.write(`\rCurated ${curatedRecipes.length} recipes...`);
        }
      }
    } catch (e) {
      // Skip bad rows
    }
  })
  .on('end', () => {
    console.log(`\nSuccess! Writing ${curatedRecipes.length} recipes to local library...`);
    fs.writeFileSync('./src/lib/data/curated_recipes.json', JSON.stringify(curatedRecipes, null, 2));
    console.log('Done!');
  });
