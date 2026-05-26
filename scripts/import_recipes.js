/**
 * SOUS-AI: Premium Recipe CSV Importer
 * 
 * This script reads a 'recipes.csv' file, automatically formats plain text columns 
 * to match the Supabase JSON/Array schemas, and batch-uploads them.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Credentials (from your environment configuration)
const SUPABASE_URL = 'https://fnppgjtxmzcigtgnfrbn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucHBnanR4bXpjaWd0Z25mcmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjMwNjUsImV4cCI6MjA5MjQzOTA2NX0.tWKJTsQz9mfq5P8neNc2M65i_YsDY65GXDhJvZNV_js'; // Note: For mass importing, use service_role key to bypass RLS if needed

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CSV_FILE_PATH = path.join(__dirname, '..', 'recipes.csv');

// Simple CSV parser helper (avoids external library dependencies)
function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Parse CSV line handling quotes
    const row = [];
    let insideQuote = false;
    let entries = [];
    let entry = '';

    for (let char of lines[i]) {
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        entries.push(entry.trim().replace(/^"|"$/g, ''));
        entry = '';
      } else {
        entry += char;
      }
    }
    entries.push(entry.trim().replace(/^"|"$/g, ''));

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = entries[index] || '';
    });
    result.push(obj);
  }
  return result;
}

async function importRecipes() {
  console.log('🧑‍🍳 Starting Premium Recipe Import...');

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV File not found! Please place your CSV at: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
  const rawRecipes = parseCSV(fileContent);
  
  console.log(`📋 Found ${rawRecipes.length} recipes in CSV. Formatting...`);

  // Transform raw CSV lines into the exact schema Supabase expects
  const formattedRecipes = rawRecipes.map((row, idx) => {
    // 1. Format ingredients string (e.g. "2 chicken breasts, 1 cup strawberries") to structured JSON
    let ingredientsJson = [];
    if (row.ingredients) {
      ingredientsJson = row.ingredients.split(/[,;\n]+/).map(ing => {
        const trimmed = ing.trim();
        // Try to separate quantity and item (e.g., "2 cups flour" or "1 lemon")
        const match = trimmed.match(/^(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?\s*(?:cups?|tbsps?|tsps?|g|kg|ml|l|cloves?|pieces?)?)\s+(.+)$/i);
        if (match) {
          return { item: match[2], qty: match[1] };
        }
        return { item: trimmed, qty: 'to taste' };
      });
    }

    // 2. Format instructions (e.g. "Step 1. Step 2.") to string array
    let instructionsArray = ['Prepare ingredients according to recipe requirements.'];
    if (row.instructions) {
      instructionsArray = row.instructions
        .split(/(?:\r?\n|(?<=\w\.)\s+)/)
        .map(step => step.trim())
        .filter(step => step.length > 0);
    }

    return {
      title: row.title || `Recipe #${idx + 1}`,
      ingredients: ingredientsJson,
      instructions: instructionsArray,
      image_url: row.image_url || 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=1200',
      is_public: true,
      user_id: null // System recipes
    };
  });

  // Batch insert into Supabase in blocks of 100 rows to optimize network calls
  const BATCH_SIZE = 100;
  for (let i = 0; i < formattedRecipes.length; i += BATCH_SIZE) {
    const batch = formattedRecipes.slice(i, i + BATCH_SIZE);
    console.log(`🚀 Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(formattedRecipes.length / BATCH_SIZE)} (${batch.length} recipes)...`);

    const { error } = await supabase
      .from('recipes')
      .insert(batch);

    if (error) {
      console.error('❌ Error inserting batch:', error.message);
    }
  }

  console.log('✨ Success! All recipes imported to your Supabase kitchen! 🧑‍🍳🎉');
}

importRecipes();
