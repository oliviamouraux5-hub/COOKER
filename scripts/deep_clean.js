const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepClean() {
  console.log('Force-cleaning the database to free up space (Small Batches)...');
  
  let deleted = 0;
  for (let i = 0; i < 500; i++) { // Max 50,000 per run to avoid hanging
    const { data, error } = await supabase
      .from('recipes')
      .delete()
      .is('user_id', null)
      .limit(100) // Tiny batches to avoid timeout
      .select('id');
      
    if (error) {
      console.error('Delete error:', error.message);
      if (error.message.includes('No space left')) {
        console.log('Database is still locked. Retrying...');
      } else {
        break;
      }
    }
    
    if (!data || data.length === 0) break;
    
    deleted += data.length;
    process.stdout.write(`\rDeleted ${deleted} recipes and freed up space...`);
  }
  
  console.log('\nCleanup pulse finished!');
}

deepClean();
