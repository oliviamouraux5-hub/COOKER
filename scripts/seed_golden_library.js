const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding the Golden 10,000 into Supabase...');
  
  const rawData = fs.readFileSync('./src/lib/data/curated_recipes.json', 'utf8');
  const recipes = JSON.parse(rawData);
  
  const BATCH_SIZE = 100; // Small batches for maximum stability
  let imported = 0;

  for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
    const batch = recipes.slice(i, i + BATCH_SIZE).map(r => ({
      title: r.title,
      ingredients: r.ingredients,
      instructions: r.instructions,
      is_public: true,
      user_id: 'a8d574d1-484f-40b3-be43-f1304500c9b0' // Assign to you
    }));

    const { error } = await supabase.from('recipes').insert(batch);
    
    if (error) {
      console.error('Batch error:', error.message);
      // If storage is full, we stop and tell the user
      if (error.message.includes('storage')) break;
    } else {
      imported += batch.length;
      process.stdout.write(`\rImported ${imported} / 10000 recipes...`);
    }
  }
  
  console.log('\nSeeding complete!');
}

seed();
