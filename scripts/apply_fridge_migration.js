const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationPath = path.join(__dirname, '../supabase/migrations/20260520163000_create_fridge_items.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

async function run() {
  console.log('Applying fridge items and snapshots migration to live Supabase database...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log('SUCCESS! The fridge_items and fridge_snapshots tables are now fully live on Supabase with RLS Policies enabled.');
  }
}

run();
