const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Create fridge_items table with category and restock support
CREATE TABLE IF NOT EXISTS fridge_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT DEFAULT 'to taste',
  category TEXT DEFAULT 'Produce',
  needs_restock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fridge_snapshots table
CREATE TABLE IF NOT EXISTS fridge_snapshots (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  photo_base64 TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fridge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for items
DROP POLICY IF EXISTS "Users can insert their own fridge items." ON fridge_items;
DROP POLICY IF EXISTS "Users can update their own fridge items." ON fridge_items;
DROP POLICY IF EXISTS "Users can delete their own fridge items." ON fridge_items;
DROP POLICY IF EXISTS "Users can view their own fridge items." ON fridge_items;

CREATE POLICY "Users can insert their own fridge items." ON fridge_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fridge items." ON fridge_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fridge items." ON fridge_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own fridge items." ON fridge_items FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for snapshots
DROP POLICY IF EXISTS "Users can insert their own snapshot." ON fridge_snapshots;
DROP POLICY IF EXISTS "Users can update their own snapshot." ON fridge_snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshot." ON fridge_snapshots;
DROP POLICY IF EXISTS "Users can view their own snapshot." ON fridge_snapshots;

CREATE POLICY "Users can insert their own snapshot." ON fridge_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own snapshot." ON fridge_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snapshot." ON fridge_snapshots FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own snapshot." ON fridge_snapshots FOR SELECT USING (auth.uid() = user_id);
`;

async function run() {
  console.log('Deploying Visual Fridge & Snapshots tables to Supabase...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log('Success! Visual Fridge & Snapshots database tables ready with strict RLS.');
  }
}

run();
