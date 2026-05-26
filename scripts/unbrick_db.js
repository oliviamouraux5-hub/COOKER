const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Emergency Drop to free up space
DROP TABLE IF EXISTS recipes CASCADE;

-- Recreate the table empty and optimized
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_ai_generated BOOLEAN DEFAULT false,
  source TEXT
);

-- Re-enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own recipes." ON recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Recipes are viewable by everyone if public." ON recipes FOR SELECT USING (is_public = true OR auth.uid() = user_id);
`;

async function run() {
  console.log('UNBRICKING DATABASE: Dropping massive table...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Manual intervention required. Please run the DROP TABLE command in the Supabase SQL Editor.');
  } else {
    console.log('SUCCESS! Storage freed. You can now sign in.');
  }
}

run();
