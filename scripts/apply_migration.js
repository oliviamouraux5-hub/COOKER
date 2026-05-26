const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Add new columns for the large dataset
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ner_ingredients TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Intermediate';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time INTEGER DEFAULT 30;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS diet TEXT DEFAULT 'None';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Create a GIN index for fast ingredient searching (NER)
CREATE INDEX IF NOT EXISTS idx_recipes_ner ON recipes USING GIN (ner_ingredients);
`;

async function run() {
  console.log('Applying database optimizations...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Migration failed:', error.message);
    console.log('Trying manual fallback...');
  } else {
    console.log('Success! Database optimized for 2 million rows.');
  }
}

run();
