const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log('Cleaning up old recipes to free up storage...');
  
  let deleted = 0;
  while (true) {
    const { data, error } = await supabase
      .from('recipes')
      .delete()
      .is('user_id', null) // Only delete the global ones
      .limit(1000)
      .select('id');
      
    if (error) {
      console.error('Delete error:', error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    deleted += data.length;
    process.stdout.write(`\rDeleted ${deleted} recipes...`);
  }
  
  console.log('\nCleanup finished!');
}

clean();
