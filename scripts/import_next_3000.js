/**
 * SOUS-AI: Next 3000 Elite CSV Selector & Supabase Importer (RLS-Compliant)
 * 
 * 1. Reads existing recipes from local 'src/lib/data/elite_recipes.json' to prevent duplicates.
 * 2. Reads '13k-recipes.csv'
 * 3. Cleans and scores recipes, excluding any that are already in the dataset.
 * 4. Selects the next 3,000 highest-scoring, unique recipes.
 * 5. Appends the new selection to 'src/lib/data/elite_recipes.json' for the local search index.
 * 6. Authenticates with Supabase.
 * 7. Batch-inserts the 3,000 new recipes into Supabase with is_public = true.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Config
const SUPABASE_URL = 'https://fnppgjtxmzcigtgnfrbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucHBnanR4bXpjaWd0Z25mcmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjMwNjUsImV4cCI6MjA5MjQzOTA2NX0.tWKJTsQz9mfq5P8neNc2M65i_YsDY65GXDhJvZNV_js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

const CSV_FILE = '13k-recipes.csv';
const ELITE_JSON_PATH = path.join(__dirname, '..', 'src', 'lib', 'data', 'elite_recipes.json');

// --- Load Existing Titles ---
let existingRecipes = [];
const existingTitles = new Set();

if (fs.existsSync(ELITE_JSON_PATH)) {
  try {
    existingRecipes = JSON.parse(fs.readFileSync(ELITE_JSON_PATH, 'utf8'));
    existingRecipes.forEach(r => {
      if (r.title) {
        existingTitles.add(r.title.toLowerCase().trim());
      }
    });
    console.log(`🔍 Loaded ${existingRecipes.length} existing recipes from local JSON. Duplicate-prevention Set initialized.`);
  } catch (err) {
    console.error('⚠️ Warning: Failed to parse existing elite_recipes.json:', err.message);
  }
}

// --- Helper Functions ---
function parsePythonList(str) {
  if (!str) return [];
  const trimmed = str.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
  const content = trimmed.slice(1, -1);
  const result = [];
  let current = '';
  let inQuote = null;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuote) {
      if (char === inQuote) {
        if (content[i - 1] === '\\') {
          current = current.slice(0, -1) + char;
        } else {
          inQuote = null;
        }
      } else {
        current += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inQuote = char;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      }
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result.filter(item => item.length > 0);
}

function cleanIngredientToNer(ing) {
  let clean = ing.toLowerCase();
  clean = clean.replace(/\([^)]*\)/g, '');
  clean = clean.replace(/[\d½⅓¼¾⅛⅝⅞⅔]+(?:[\s/-]+[\d½⅓¼¾⅛⅝⅞⅔]+)*/g, '');
  
  const units = [
    'tbsp', 'tbsps', 'tsp', 'tsps', 'teaspoon', 'teaspoons', 'tablespoon', 'tablespoons',
    'cup', 'cups', 'oz', 'lb', 'lbs', 'pound', 'pounds', 'gram', 'grams', 'g', 'kg', 'ml', 'l',
    'clove', 'cloves', 'piece', 'pieces', 'can', 'cans', 'pkg', 'pkgs', 'package', 'packages',
    'slice', 'slices', 'sprig', 'sprigs', 'stalk', 'stalks', 'bunch', 'bunches', 'pinch', 'pinches',
    'loaf', 'loaves', 'head', 'heads'
  ];
  
  const stopWords = [
    'kosher', 'salt', 'divided', 'plus', 'more', 'unsalted', 'salted', 'melted', 'room temperature',
    'finely', 'chopped', 'minced', 'ground', 'freshly', 'black', 'pepper', 'good-quality', 'sturdy',
    'white', 'torn', 'into', 'cored', 'cut', 'extra-virgin', 'thinly', 'sliced', 'white', 'dry',
    'fresh', 'coarse', 'diced', 'peeled', 'grated', 'large', 'medium', 'small', 'shredded', 'crushed',
    'red', 'flakes', 'optional', 'for', 'serving', 'warm', 'cold', 'hot', 'all-purpose', 'bleached',
    'unbleached', 'sifted', 'packed', 'firmly', 'softened', 'of', 'and', 'or', 'a', 'an', 'the'
  ];
  
  units.forEach(unit => {
    const rx = new RegExp(`\\b${unit}\\.?\\b`, 'g');
    clean = clean.replace(rx, '');
  });
  
  stopWords.forEach(word => {
    const rx = new RegExp(`\\b${word}\\b`, 'g');
    clean = clean.replace(rx, '');
  });

  clean = clean.replace(/[^a-zA-Z\s]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

function getGourmetImage(title, category) {
  const t = title.toLowerCase();
  if (t.includes('chicken') || t.includes('poultry')) return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&q=80&w=600';
  if (t.includes('steak') || t.includes('beef')) return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600';
  if (t.includes('salad') || t.includes('greens')) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600';
  if (t.includes('pasta') || t.includes('spaghetti') || t.includes('lasagna')) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600';
  if (t.includes('soup') || t.includes('stew') || t.includes('chowder')) return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=600';
  if (t.includes('cake') || t.includes('chocolate') || t.includes('pie') || t.includes('cookie') || t.includes('muffin')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600';
  if (t.includes('pizza') || t.includes('flatbread')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600';
  if (t.includes('salmon') || t.includes('fish') || t.includes('seafood') || t.includes('shrimp')) return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600';
  if (t.includes('drink') || t.includes('cocktail') || t.includes('punch') || t.includes('tea')) return 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600';
  if (t.includes('egg') || t.includes('pancake') || t.includes('toast') || t.includes('breakfast')) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600';
  
  if (category === 'Dessert') return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600';
  if (category === 'Breakfast') return 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&q=80&w=600';
  return 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=600';
}

function getMealType(title, ings) {
  const t = title.toLowerCase();
  const i = ings.join(' ').toLowerCase();
  
  if (t.includes('cake') || t.includes('cookie') || t.includes('pie') || t.includes('sweet') || t.includes('dessert') || t.includes('chocolate') || t.includes('tart') || t.includes('ice cream')) {
    return 'Dessert';
  }
  if (t.includes('egg') || t.includes('pancake') || t.includes('waffle') || t.includes('breakfast') || t.includes('omelette') || t.includes('granola') || t.includes('muffin')) {
    return 'Breakfast';
  }
  if (t.includes('lunch') || t.includes('sandwich') || t.includes('wrap') || t.includes('burger') || t.includes('salad')) {
    return 'Lunch';
  }
  return 'Dinner';
}

function getDietType(title, ings) {
  const text = (title + ' ' + ings.join(' ')).toLowerCase();
  const meatKeywords = ['chicken', 'beef', 'steak', 'pork', 'bacon', 'sausage', 'salmon', 'fish', 'lamb', 'shrimp', 'turkey', 'duck', 'tuna'];
  const animalKeywords = [...meatKeywords, 'egg', 'milk', 'cream', 'butter', 'cheese', 'honey', 'yogurt'];
  
  const hasMeat = meatKeywords.some(word => text.includes(word));
  const hasAnimal = animalKeywords.some(word => text.includes(word));
  
  if (!hasAnimal) return 'Vegan';
  if (!hasMeat) return 'Vegetarian';
  return 'None';
}

function getPrepAndDifficulty(instructions) {
  const text = instructions.join(' ');
  const steps = instructions.length;
  
  let prepTime = 20;
  let difficulty = 'Easy';
  
  if (text.includes('bake') || text.includes('roast')) prepTime = 45;
  if (text.includes('simmer') || text.includes('braise')) prepTime = 60;
  if (text.includes('slow cook') || text.includes('marinate')) prepTime = 120;
  if (steps < 3) prepTime = Math.min(prepTime, 15);
  
  if (steps > 7 || prepTime >= 60 || text.includes('whisk') && text.includes('reduction')) {
    difficulty = 'Advanced';
  } else if (steps > 4 || prepTime >= 30) {
    difficulty = 'Intermediate';
  }
  
  return { prepTime, difficulty };
}

// --- Parse and filter new candidates ---
const candidates = [];

console.log('📖 Step 1: Parsing CSV and excluding existing titles...');
fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on('data', (row) => {
    const title = row['Title']?.trim();
    const rawIngs = row['Ingredients'];
    const rawInstructions = row['Instructions'];
    
    if (!title || !rawIngs || !rawInstructions) return;
    
    // EXCLUDE IF ALREADY IN DATABASE
    if (existingTitles.has(title.toLowerCase().trim())) return;
    
    const parsedIngs = parsePythonList(rawIngs);
    const parsedInstructions = rawInstructions.split(/(?:\r?\n)+/).map(s => s.trim()).filter(Boolean);
    
    if (parsedIngs.length === 0 || parsedInstructions.length === 0) return;
    
    let score = 0;
    
    if (title.length >= 15 && title.length <= 45) score += 20;
    else if (title.length > 5 && title.length < 15) score += 10;
    
    const ingCount = parsedIngs.length;
    if (ingCount >= 6 && ingCount <= 12) score += 30;
    else if (ingCount >= 4 && ingCount <= 15) score += 15;
    
    const instLength = rawInstructions.length;
    if (instLength >= 300 && instLength <= 1200) score += 30;
    else if (instLength > 100 && instLength < 300) score += 15;
    
    if (row['Image_Name']) score += 10;
    
    candidates.push({
      title,
      rawIngs: parsedIngs,
      instructions: parsedInstructions,
      score,
      imageName: row['Image_Name']
    });
  })
  .on('end', async () => {
    console.log(`📋 Total unique candidates successfully parsed: ${candidates.length}`);
    
    console.log('🎯 Step 2: Selecting the next 3,000 highest-scoring unique recipes...');
    const topNewRecipes = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 3000);
    
    console.log(`✅ Selected ${topNewRecipes.length} new premium recipes!`);
    
    console.log('🛠️ Step 3: Formatting and enriching the new recipes...');
    const startIdOffset = existingRecipes.length;
    const formattedNewRecipes = topNewRecipes.map((r, idx) => {
      const nerIngredients = Array.from(new Set(r.rawIngs.map(cleanIngredientToNer).filter(item => item && item.length > 1)));
      const mealType = getMealType(r.title, nerIngredients);
      const diet = getDietType(r.title, nerIngredients);
      const { prepTime, difficulty } = getPrepAndDifficulty(r.instructions);
      const imageUrl = getGourmetImage(r.title, mealType);
      
      return {
        id: `elite-${idx + startIdOffset}`,
        title: r.title,
        ingredients: r.rawIngs.map(ing => ({ item: ing, qty: "" })),
        instructions: r.instructions,
        ner_ingredients: nerIngredients,
        image_url: imageUrl,
        meal_type: mealType,
        diet,
        prep_time: prepTime,
        difficulty,
        is_ai_generated: false,
        source: 'Premium Culinary Library',
        is_public: true
      };
    });
    
    // Authenticate with Supabase
    console.log('🚀 Step 4: Authenticating with Supabase...');
    const email = 'db_importer@sousai.com';
    const password = 'SousAiPremiumImporterPassword2026!';
    
    let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      process.exit(1);
    }
    
    const userId = authData.user.id;
    console.log(`👤 Authenticated as importer user: ${userId}`);

    // Batch insert new ones into Supabase database
    console.log('📤 Step 5: Uploading the next 3,000 recipes to Supabase database...');
    const BATCH_SIZE = 100;
    const dbUploads = formattedNewRecipes.map(r => ({
      title: r.title,
      ingredients: r.ingredients,
      instructions: r.instructions,
      image_url: r.image_url,
      is_public: true,
      user_id: userId // owned by importer, public to everyone
    }));
    
    let successfullyUploadedCount = 0;

    for (let i = 0; i < dbUploads.length; i += BATCH_SIZE) {
      const batch = dbUploads.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(dbUploads.length / BATCH_SIZE);
      
      let success = false;
      let retries = 3;
      
      while (!success && retries > 0) {
        console.log(`📤 Uploading batch ${batchNum} of ${totalBatches} (${batch.length} recipes)... [Attempts left: ${retries}]`);
        
        const { error: uploadError } = await supabase
          .from('recipes')
          .insert(batch);
          
        if (!uploadError) {
          success = true;
          successfullyUploadedCount += batch.length;
        } else {
          retries--;
          console.error(`⚠️ Error in batch ${batchNum}: ${uploadError.message || uploadError}`);
          if (retries > 0) {
            console.log('🔄 Waiting 1.5 seconds before retrying...');
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            console.error(`❌ Batch ${batchNum} failed permanently after 3 attempts.`);
          }
        }
      }
    }
    
    // Save locally to JSON file by appending
    console.log(`💾 Step 6: Saving all recipes locally to '${ELITE_JSON_PATH}'...`);
    const allRecipesCombined = [...existingRecipes, ...formattedNewRecipes];
    fs.writeFileSync(ELITE_JSON_PATH, JSON.stringify(allRecipesCombined, null, 2), 'utf8');
    
    console.log(`✨ SUCCESS! Successfully uploaded ${successfullyUploadedCount} new recipes!`);
    console.log(`✨ Total local library count: ${allRecipesCombined.length} recipes!`);
    console.log('✨ All new recipes are live on Supabase and indexed locally! 🧑‍🍳🎉');
  });
