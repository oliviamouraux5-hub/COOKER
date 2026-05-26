-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  dietary_preferences JSONB DEFAULT '{"vegan": false, "gluten_free": false}',
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ingredients JSONB NOT NULL, -- List of {item: string, qty: string}
  instructions TEXT[] NOT NULL,
  image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles are viewable by everyone." ON profiles FOR SELECT USING (true);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own recipes." ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipes." ON recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes." ON recipes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Recipes are viewable by everyone if public or by owner." ON recipes FOR SELECT USING (is_public = true OR auth.uid() = user_id);
