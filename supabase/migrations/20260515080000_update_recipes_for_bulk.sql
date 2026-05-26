-- Add new columns for the large dataset
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ner_ingredients TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Intermediate';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time INTEGER DEFAULT 30;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS diet TEXT DEFAULT 'None';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Create a GIN index for fast ingredient searching (NER)
CREATE INDEX IF NOT EXISTS idx_recipes_ner ON recipes USING GIN (ner_ingredients);

-- Create a Full-Text Search index on the title for lightning-fast keyword search
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (to_tsvector('english', title)) STORED;
CREATE INDEX IF NOT EXISTS idx_recipes_fts ON recipes USING GIN (fts);

-- Allow public access for the recipe library (since they are gathered from external sources)
DROP POLICY IF EXISTS "Recipes are viewable by everyone if public or by owner." ON recipes;
CREATE POLICY "Recipes are viewable by everyone if public or by owner." ON recipes FOR SELECT USING (is_public = true OR auth.uid() = user_id OR user_id IS NULL);
