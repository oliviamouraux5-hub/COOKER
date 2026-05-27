'use server'

import { createClient } from '@/lib/supabase/server'
import { fridgeSchema, type FridgeFormValues } from '@/lib/validations/fridge'
import { revalidatePath } from 'next/cache'
import eliteRecipes from '@/lib/data/elite_recipes.json'
import { INGREDIENT_MEAL_MAP, MealType } from '@/lib/data/culinary_knowledge'

export async function generateRecipes(values: FridgeFormValues & { selectedHeroes?: string[], manualIngredients?: string }) {
  // Validate input
  const validatedFields = fridgeSchema.safeParse(values)
  
  if (!validatedFields.success) {
    return { error: 'Invalid input' }
  }

  const { ingredients, prepTime, difficulty, mealType, diet, isCreative, creativeType, pantry } = validatedFields.data
  const selectedHeroes = values.selectedHeroes
  const manualIngredients = values.manualIngredients
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Guest/Demo Mode authorized by default for recipe searches

  // 0. Build the total ingredient pool (Fridge + Pantry)
  const fridgeWords = (ingredients || '').toLowerCase().split(/[\s,]+/).filter(w => w.length > 2)
  const pantryWords = pantry ? Object.keys(pantry).filter(k => pantry[k]).flatMap(k => k.toLowerCase().split(' ')) : []
  const totalPool = Array.from(new Set([...fridgeWords, ...pantryWords]))

  // 1. Explicit AI Creative Mode - Quality over Quantity
  // 1. Explicit AI Creative Mode - State-of-the-Art Dynamic Chef Generator
  if (isCreative) {
    let apiKey = process.env.GEMINI_API_KEY
  
    // Real-time server-disk fallback for dynamic binding:
    if (!apiKey) {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const envPath = '/Users/oliviamouraux/fridge/.env.local'
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8')
          const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s#]+)/)
          if (match && match[1]) {
            apiKey = match[1].trim()
          }
        }
      } catch (err) {
        console.error("Failed to dynamically read env file for recipe generator:", err)
      }
    }

    if (apiKey) {
      try {
        const prompt = `Based on the following available ingredients and user preferences, generate exactly 2 to 3 creative, highly delicious recipes that the user can cook.

Ingredients available in my fridge: ${ingredients}
Chef's Pantry staples (assumed available): ${pantryWords.join(', ')}
Prep Time Limit: ${prepTime ? `Under ${prepTime} minutes` : 'Any'}
Difficulty Level: ${difficulty || 'All'}
Meal Type Course: ${mealType || 'Any'}
Dietary Restrictions: ${diet || 'None'}
AI Mode Style: ${creativeType === 'strict' ? 'STRICT ZERO-WASTE (strictly minimize ingredients outside of the available fridge/pantry ingredients)' : 'GOURMET CHEF (allow including a few highly creative complementary elements like fresh herbs or premium seasonings to make it a gourmet dish)'}
${selectedHeroes && selectedHeroes.length > 0 ? `IMPORTANT MAIN HERO INGREDIENT(S) TO HIGHLIGHT AS THE STARS OF THE PLATE: ${selectedHeroes.join(', ')}. Please build the recipe's title, visual presentation, and steps specifically to showcase and hero these ingredients as the main centerpiece elements of the dish.` : ''}
${manualIngredients && manualIngredients.trim() ? `CRITICAL SEARCH INTENT REQUIREMENT: The user manually searched for these specific ingredients: "${manualIngredients}". You MUST make them primary components of the generated recipes. The other synced fridge items are supporting ingredients to build the dish around them.` : ''}

Your output must be a valid JSON array of recipe objects, containing exactly these keys:
- id: a unique string like "ai-recipe-1", "ai-recipe-2"
- title: a mouth-watering, premium name for the dish (e.g. "Pan-Seared Sage Butter Chicken with Roasted Cherry Tomatoes")
- ingredients: an array of objects with "item" (string, capitalized, e.g. "Fresh Tomato") and "qty" (string, e.g. "200g", "1 tbsp")
- instructions: an array of strings representing the step-by-step cooking instructions. Write natural, warm, and elegant steps that read exactly like a premium gourmet recipe from **NYT Cooking** or **Bon Appétit**. Avoid sterile, robotic lists or mechanical formulaic steps. Instead, write like a real human chef cooking with heart: use expressive, sensory descriptions (e.g., "In a large skillet, warm the olive oil over medium-high heat until it shimmers," or "Gently toss the hot pasta with the cherry tomatoes, adding a splash of starchy pasta water to create a silky, glossy emulsion"). Ensure the steps are completely thorough and satisfy all phases of the cooking process—never skip intermediate steps (like resting meat or simmering sauces) and never let the JSON format compromise the richness, completeness, and realism of the instructions.
- difficulty: "Beginner", "Intermediate", or "Advanced"
- meal_type: "Breakfast", "Lunch", "Dinner", "Snack", "Dessert", or "Drinks"
- diet: "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", or "None"
- prep_time: an integer representing cooking time in minutes (e.g. 20)
- is_ai_generated: true
- matchPercentage: 100
- usedIngredients: an array of strings representing which of the user's available ingredients were actually incorporated in this specific recipe (e.g. ["chicken", "tomato"])
- missingIngredients: an array of strings listing any complementary ingredients needed that are not in the available list (e.g. ["fresh basil", "heavy cream"])
- source: "Gourmet AI Chef"
- image_url: a high-quality Unsplash URL suitable for the food item (e.g., choose a beautiful, realistic food/cooking Unsplash photo URL like "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200" or similar)

Do NOT include any conversational introduction, no markdown fences, and output ONLY the clean JSON array.`

        // Multi-tiered endpoint list to support both new v1 stable, v1beta endpoints, and model aliases
        const urls = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
        ]

        let textResult = ""
        let lastError = ""
        let successfulUrl = ""

        for (const url of urls) {
          try {
            console.log("Calling recipe generation Gemini API endpoint:", url.split('?')[0])
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: {
                  parts: [{
                    text: "You are a world-class professional culinary Michelin-star chef and expert recipe creator. You write highly realistic, complete, and gourmet recipes. The instructions must read like an authentic, high-end cookbook (like NYT Cooking or Bon Appétit) with warm, natural, and expressive language. Never skip intermediate steps, do not write robotic bulleted lists, and ensure each step is complete and satisfying from prep to plating."
                  }]
                },
                generationConfig: {
                  temperature: 0.8,
                  responseMimeType: "application/json"
                }
              })
            })

            if (!response.ok) {
              lastError = `Status ${response.status}: ${await response.text()}`
              console.warn("Failed endpoint. Trying next...", lastError)
              continue
            }

            const data = await response.json()
            const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (candidateText) {
              textResult = candidateText
              successfulUrl = url.split('?')[0]
              break
            }
          } catch (err: any) {
            lastError = err.message || err
            console.warn("Exception calling endpoint. Trying next...", lastError)
          }
        }

        if (textResult) {
          // Strip markdown blocks if present
          let cleaned = textResult.trim()
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(json)?/, '')
            cleaned = cleaned.replace(/```$/, '')
            cleaned = cleaned.trim()
          }
          
          try {
            const parsed = JSON.parse(cleaned)
            if (Array.isArray(parsed)) {
              console.log(`Successfully generated ${parsed.length} gourmet recipes using endpoint [${successfulUrl}]`)
              
              parsed.forEach(recipe => {
                const totalRecipeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0
                const missingCount = Array.isArray(recipe.missingIngredients) ? recipe.missingIngredients.length : 0
                const matched = totalRecipeIngredients - missingCount

                recipe.totalCount = totalRecipeIngredients
                recipe.matchedCount = matched < 0 ? 0 : matched
                recipe.matchPercentage = totalRecipeIngredients > 0 
                  ? Math.round((recipe.matchedCount / totalRecipeIngredients) * 100) 
                  : 100
                if (recipe.matchPercentage > 100) recipe.matchPercentage = 100

                // Strict Prep Time Override: If Gemini hallucinates a time above requested threshold, override it safely!
                if (prepTime) {
                  const limit = Number(prepTime)
                  if (Number(recipe.prep_time || 30) > limit) {
                    recipe.prep_time = limit
                  }
                }

                // Strict Difficulty Override
                if (difficulty && difficulty !== 'All') {
                  recipe.difficulty = difficulty
                }
              })
              return { recipes: parsed }
            }
          } catch (parseErr) {
            console.error("Failed to parse dynamic recipe JSON directly, attempting regex match...", parseErr)
            const match = textResult.match(/\[\s*\{[\s\S]*\}\s*\]/)
            if (match) {
              const parsed = JSON.parse(match[0])
              if (Array.isArray(parsed)) {
                parsed.forEach(recipe => {
                  const totalRecipeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0
                  const missingCount = Array.isArray(recipe.missingIngredients) ? recipe.missingIngredients.length : 0
                  const matched = totalRecipeIngredients - missingCount

                  recipe.totalCount = totalRecipeIngredients
                  recipe.matchedCount = matched < 0 ? 0 : matched
                  recipe.matchPercentage = totalRecipeIngredients > 0 
                    ? Math.round((recipe.matchedCount / totalRecipeIngredients) * 100) 
                    : 100
                  if (recipe.matchPercentage > 100) recipe.matchPercentage = 100

                  // Strict Prep Time Override
                  if (prepTime) {
                    const limit = Number(prepTime)
                    if (Number(recipe.prep_time || 30) > limit) {
                      recipe.prep_time = limit
                    }
                  }

                  // Strict Difficulty Override
                  if (difficulty && difficulty !== 'All') {
                    recipe.difficulty = difficulty
                  }
                })
                return { recipes: parsed }
              }
            }
          }
        } else {
          console.error("All recipe generation endpoints failed. Last error:", lastError)
        }
      } catch (err) {
        console.error("Failed dynamic recipe generation flow:", err)
      }
    }

    // Fallback: Elegant Clustering Engine if the API key isn't active or fails
    console.warn("Using offline clustering engine fallback for recipe generation...")
    const words = totalPool
    const clusters = {
      savory_base: ['chicken', 'beef', 'pork', 'fish', 'tofu', 'egg', 'shrimp', 'turkey'],
      aromatics: ['onion', 'garlic', 'ginger', 'shallot', 'leek'],
      veggies: ['tomato', 'potato', 'carrot', 'broccoli', 'spinach', 'pepper', 'cucumber', 'lettuce', 'zucchini'],
      spices: ['curry', 'cumin', 'turmeric', 'paprika', 'chili', 'cinnamon', 'nutmeg', 'salt', 'pepper'],
      sweet: ['chocolate', 'sugar', 'honey', 'syrup', 'strawberry', 'apple', 'banana', 'berry', 'fruit', 'vanilla'],
      acidic: ['pickle', 'vinegar', 'lemon', 'lime', 'ketchup', 'mustard', 'caper'],
      dairy: ['milk', 'cream', 'cheese', 'yogurt', 'butter', 'coconut cream']
    }

    const hasSavory = words.some(w => clusters.savory_base.some(k => w.includes(k)))
    const hasSweet = words.some(w => clusters.sweet.some(k => w.includes(k)))
    const hasVeggies = words.some(w => clusters.veggies.some(k => w.includes(k)))

    const activeStyles = []
    if (mealType && mealType !== 'All') {
      if (mealType === 'Dessert') {
        activeStyles.push({ name: "Sweet Infusion", focus: ['sweet', 'dairy'], type: 'sweet' })
      } else if (mealType === 'Breakfast') {
        activeStyles.push({ name: "Morning Skillet", focus: ['savory_base', 'dairy', 'sweet'], type: 'savory' })
      } else {
        if (hasSavory) activeStyles.push({ name: "Premium Entrée", focus: ['savory_base', 'aromatics', 'veggies', 'spices', 'dairy'], type: 'savory' })
        if (hasVeggies && !hasSavory) activeStyles.push({ name: "Garden Medley", focus: ['veggies', 'acidic', 'aromatics'], type: 'savory' })
      }
    } else {
      if (hasSavory) activeStyles.push({ name: "Premium Entrée", focus: ['savory_base', 'aromatics', 'veggies', 'spices', 'dairy'], type: 'savory' })
      if (hasSweet) activeStyles.push({ name: "Sweet Infusion", focus: ['sweet', 'dairy'], type: 'sweet' })
      if (hasVeggies && !hasSavory) activeStyles.push({ name: "Garden Medley", focus: ['veggies', 'acidic', 'aromatics'], type: 'savory' })
    }

    if (activeStyles.length === 0) activeStyles.push({ name: "Chef's Choice", focus: ['aromatics', 'veggies', 'acidic', 'spices'], type: 'savory' })

    const aiRecipes = activeStyles.map((style, idx) => {
      const harmoniousWords = words.filter(word => style.focus.some(clusterKey => (clusters as any)[clusterKey].some((keyword: string) => word.includes(keyword))))
      const finalWords = harmoniousWords.length > 0 ? harmoniousWords : words.slice(0, 3)
      const displayIngs = finalWords.map(w => w.charAt(0).toUpperCase() + w.slice(1))
      const mainIng = finalWords[0]?.charAt(0).toUpperCase() + finalWords[0]?.slice(1) || 'Chef'

      return {
        id: `ai-${idx}`,
        title: `${style.name} with ${mainIng}`,
        ingredients: displayIngs.map(item => ({ item, qty: "to taste" })),
        instructions: [
          `**Step 1: Prep and Mise en Place.** Carefully wash, chop, and measure your core ingredients: ${displayIngs.join(', ')}. Set them in individual small bowls to organize your cooking station.`,
          `**Step 2: Build the Flavor Base.** Heat 1 tablespoon of olive oil or butter in a pan over medium heat. Sauté the aromatics and core elements for 5-6 minutes until tender, lightly golden, and filled with a rich fragrance.`,
          `**Step 3: Simmer and Season.** Season your dish with a pinch of sea salt, black pepper, and your favorite dry herbs. Allow the flavors to meld together over low heat for 3-4 minutes.`,
          `**Step 4: Plate and Garnish.** Transfer your creation onto a warm plate. Garnish with a drizzle of extra virgin olive oil, fresh herbs, or a squeeze of lemon to make it look stunning before serving.`
        ],
        image_url: style.type === 'sweet' ? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200" : "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=1200",
        is_public: true,
        difficulty: (difficulty && difficulty !== 'All') ? difficulty : "Intermediate",
        meal_type: style.type === 'sweet' ? "Dessert" : (mealType && mealType !== 'All' ? mealType : "Dinner"),
        diet: diet || "None",
        prep_time: 20,
        is_ai_generated: true,
        matchPercentage: 100,
        missingIngredients: [],
        source: `Zero-Waste AI (Offline)`
      }
    })

    return { recipes: aiRecipes }
  }

  // 3. Culinary Context Filtering
  let contextPool = fridgeWords;
  if (mealType && mealType !== 'All') {
    const meal = mealType as MealType;
    contextPool = fridgeWords.filter(word => {
      const knownIng = Object.keys(INGREDIENT_MEAL_MAP).find(k => word.includes(k) || k.includes(word));
      if (!knownIng) return true;
      return INGREDIENT_MEAL_MAP[knownIng].includes(meal);
    });
    if (contextPool.length === 0) contextPool = fridgeWords;
  }

  const totalSearchPool = [...contextPool, ...pantryWords];

  // 4. Elite Library Search (Broad & Smart)
  const allSearchTerms = totalSearchPool;  
  if (allSearchTerms.length > 0) {
    // Search library for ANY match
    let matches = (eliteRecipes as any[]).filter(recipe => {
      const recipeTitle = recipe.title.toLowerCase()
      const recipeIngs = recipe.ner_ingredients.join(' ').toLowerCase()
      
      return allSearchTerms.some(term => 
        recipeTitle.includes(term) || recipeIngs.includes(term)
      )
    })

    // If manualIngredients is provided, strongly prioritize recipes containing manual terms in offline fallback
    if (manualIngredients && manualIngredients.trim()) {
      const manualWords = manualIngredients.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2)
      if (manualWords.length > 0) {
        matches = matches.filter(r => {
          const title = r.title.toLowerCase()
          const ings = r.ner_ingredients.join(' ').toLowerCase()
          const fullText = `${title} ${ings}`
          return manualWords.some(word => fullText.includes(word))
        })
      }
    }

    // APPLY FILTERS (Smart Categorization)
    if (prepTime) {
      const limit = Number(prepTime)
      matches = matches.filter(r => {
        const time = Number(r.prep_time || r.prepTime || 25)
        return time <= limit
      })
    }

    if (difficulty && difficulty !== 'All') {
      matches = matches.filter(r => {
        const diff = (r.difficulty || r.difficulty_level || 'Intermediate').toLowerCase()
        const target = difficulty.toLowerCase()
        if (target === 'beginner' && (diff === 'easy' || diff === 'beginner')) return true
        if (target === 'easy' && (diff === 'easy' || diff === 'beginner')) return true
        return diff === target
      })
    }

    if (mealType && mealType !== 'All') {
      matches = matches.filter(r => {
        // If the recipe has a specific meal_type tag, enforce it!
        if (r.meal_type) {
          return r.meal_type === mealType
        }
        
        // Fallback guess from keywords (only for legacy mock data without a tag)
        const title = r.title.toLowerCase()
        const ings = r.ner_ingredients.join(' ').toLowerCase()
        if (mealType === 'Dessert') {
          const dessertWords = ['cake', 'cookie', 'pie', 'pudding', 'sweet', 'strawberry', 'chocolate', 'dessert', 'muffin', 'sugar', 'fruit']
          return dessertWords.some(word => title.includes(word) || ings.includes(word))
        }
        if (mealType === 'Breakfast') {
          const breakfastWords = ['egg', 'pancake', 'muffin', 'breakfast', 'toast', 'bacon', 'omelette', 'cereal']
          return breakfastWords.some(word => title.includes(word) || ings.includes(word))
        }
        if (mealType === 'Dinner' || mealType === 'Lunch') {
          const savoryWords = ['chicken', 'beef', 'steak', 'pasta', 'roast', 'soup', 'stew', 'curry', 'salmon', 'pork']
          return savoryWords.some(word => title.includes(word) || ings.includes(word))
        }
        return true
      })
    }

    if (diet && diet !== 'All') {
      matches = matches.filter(r => {
        const title = r.title.toLowerCase();
        const ingsList = (r.ner_ingredients || r.ingredients?.map((i: any) => i.item) || []).map((i: string) => i.toLowerCase());
        const ingsStr = ingsList.join(' ');
        const fullText = `${title} ${ingsStr}`;

        // 1. Meat, poultry, seafood keywords
        const meatKeywords = [
          'chicken', 'beef', 'steak', 'pork', 'bacon', 'sausage', 'salmon', 'fish', 'lamb', 'shrimp', 'turkey', 'duck', 
          'tuna', 'ham', 'pepperoni', 'salami', 'prosciutto', 'anchovies', 'crab', 'lobster', 'seafood', 'gelatin', 'lard'
        ];
        
        // 2. Animal products (milk, eggs, dairy, etc.)
        const animalKeywords = [
          ...meatKeywords, 
          'egg', 'milk', 'cream', 'butter', 'cheese', 'honey', 'yogurt', 'whey', 'ghee', 'parmesan', 'mozzarella', 'cheddar'
        ];

        // 3. Gluten containing keywords
        const glutenKeywords = [
          'wheat', 'flour', 'barley', 'rye', 'bread', 'pasta', 'couscous', 'semolina', 'spelt', 'bulgur', 'tortilla', 
          'noodle', 'soy sauce', 'bagel', 'bun', 'cookie', 'cake', 'dough', 'crouton', 'gravy'
        ];

        // 4. Dairy containing keywords
        const dairyKeywords = [
          'milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'ghee', 'parmesan', 'mozzarella', 'cheddar', 
          'ricotta', 'mascarpone', 'buttermilk'
        ];

        // 5. High Protein keywords (primary protein sources)
        const proteinKeywords = [
          'chicken', 'beef', 'steak', 'pork', 'turkey', 'salmon', 'tuna', 'fish', 'shrimp', 'tofu', 'tempeh', 'egg', 
          'protein powder', 'greek yogurt', 'cottage cheese', 'lentils', 'beans', 'chickpeas'
        ];

        // 6. Carbohydrate heavy keywords
        const carbKeywords = [
          'sugar', 'bread', 'flour', 'pasta', 'rice', 'potato', 'potatoes', 'corn', 'honey', 'maple syrup', 'sweet potato',
          'tortilla', 'bagel', 'bun', 'cookie', 'cake', 'dough', 'noodle', 'cereal', 'oats', 'oatmeal'
        ];

        // 7. Non-Halal keywords
        const nonHalalKeywords = [
          'pork', 'bacon', 'ham', 'lard', 'gelatin', 'wine', 'alcohol', 'beer', 'cognac', 'bourbon', 'rum', 'sake', 
          'pepperoni', 'salami', 'prosciutto'
        ];

        if (diet === 'Vegetarian') {
          if (r.diet === 'Vegetarian' || r.diet === 'Vegan') return true;
          return !meatKeywords.some(word => fullText.includes(word));
        }

        if (diet === 'Vegan') {
          if (r.diet === 'Vegan') return true;
          return !animalKeywords.some(word => fullText.includes(word));
        }

        if (diet === 'Gluten-Free') {
          if (r.diet === 'Gluten-Free') return true;
          const hasGluten = glutenKeywords.some(word => {
            if (fullText.includes(`gluten-free ${word}`) || fullText.includes(`gluten free ${word}`)) {
              return false;
            }
            return fullText.includes(word);
          });
          return !hasGluten;
        }

        if (diet === 'Dairy-Free') {
          if (r.diet === 'Dairy-Free') return true;
          return !dairyKeywords.some(word => fullText.includes(word));
        }

        if (diet === 'High Protein') {
          if (r.diet === 'High Protein') return true;
          const hasProtein = proteinKeywords.some(word => fullText.includes(word));
          const isDessert = ['cookie', 'cake', 'candy', 'pudding', 'tart'].some(word => title.includes(word));
          return hasProtein && !isDessert;
        }

        if (diet === 'Low Carb') {
          if (r.diet === 'Low Carb') return true;
          return !carbKeywords.some(word => fullText.includes(word));
        }

        if (diet === 'Halal') {
          if (r.diet === 'Halal') return true;
          return !nonHalalKeywords.some(word => fullText.includes(word));
        }

        if (diet === 'Keto') {
          if (r.diet === 'Keto') return true;
          const hasCarb = carbKeywords.some(word => fullText.includes(word));
          const hasKetoFat = ['butter', 'oil', 'cheese', 'egg', 'avocado', 'bacon', 'cream', 'nut'].some(word => fullText.includes(word));
          return !hasCarb && (hasKetoFat || meatKeywords.some(word => fullText.includes(word)));
        }

        return true;
      })
    }

    if (matches.length > 0) {
      // Calculate scores for all matches
      const scoredMatches = matches.map(r => {
        const recipeIngs = r.ner_ingredients.map((i: string) => i.toLowerCase())
        const matchedIngs = recipeIngs.filter((ri: string) => totalPool.some(tp => ri.includes(tp)))
        const matchPercentage = Math.round((matchedIngs.length / recipeIngs.length) * 100)
        const missingIngredients = r.ner_ingredients.filter((ri: string) => !totalPool.some(tp => ri.toLowerCase().includes(tp)))
        
        return { 
          ...r, 
          is_ai_generated: false,
          matchPercentage,
          matchedCount: matchedIngs.length,
          totalCount: recipeIngs.length,
          missingIngredients: missingIngredients.slice(0, 3)
        }
      })

      // SORT BY MATCH QUALITY (Highest match first)
      const sortedMatches = scoredMatches.sort((a, b) => b.matchPercentage - a.matchPercentage)
      
      return { recipes: sortedMatches.slice(0, 100) }
    }
  }

  return { recipes: [] }
}

export async function scanFridgeWithGemini(base64Image: string, mimeType: string) {
  let apiKey = process.env.GEMINI_API_KEY
  
  // Real-time server-disk fallback looking at multiple robust paths:
  if (!apiKey) {
    try {
      const fs = await import('fs')
      const path = await import('path')
      const possiblePaths = [
        '/Users/oliviamouraux/fridge/.env.local',
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '../.env.local')
      ]
      
      for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8')
          const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s#]+)/)
          if (match && match[1]) {
            apiKey = match[1].trim()
            console.log("Successfully resolved GEMINI_API_KEY dynamically from:", envPath)
            break
          }
        }
      }
    } catch (err) {
      console.error("Failed to dynamically load fs/path or read env file:", err)
    }
  }

  if (!apiKey) {
    return {
      success: false,
      error: "GEMINI_API_KEY is missing. Please define it in your .env.local file and RESTART your development terminal server so Next.js can load it! 🔑"
    }
  }

  try {
    // Powerful, descriptive system prompt for perfect kitchen vision detection:
    const prompt = "You are a state-of-the-art food and kitchen vision AI. Analyze this image of a fridge, pantry, or kitchen cabinet carefully. Identify every single food item, raw ingredient, beverage, fruit, vegetable, condiment, sauce, dairy product, cheese, meat, fish, or grocery package visible in the photo. Compile them into a single, clean, comma-separated list of ingredients in English (for example: tomato, milk, cheddar cheese, eggs, spinach, orange juice). Do NOT write any conversational introduction, no bullet points, no markdown codeblocks, and no markdown formatting at all. Just output the raw, clean comma-separated list of items."

    // Multi-tiered endpoint list containing stable production endpoints and model aliases for active 2.0, 2.5, 3.5, and latest pointers:
    const urls = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    ]

    let lastError = ""
    let textResult = ""
    let successfulUrl = ""

    for (const url of urls) {
      try {
        console.log("Trying Gemini API endpoint:", url.split('?')[0])
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  // 1. Put image data first
                  {
                    inlineData: {
                      mimeType: mimeType || "image/jpeg",
                      data: base64Image
                    }
                  },
                  // 2. Prompt instructions second
                  { text: prompt }
                ]
              }
            ]
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          lastError = `Status ${response.status}: ${errText}`
          console.warn(`Endpoint failed with error: ${lastError}. Trying next endpoint...`)
          continue
        }

        const data = await response.json()
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (candidateText) {
          textResult = candidateText
          successfulUrl = url.split('?')[0]
          break
        }
      } catch (err: any) {
        lastError = err.message || err
        console.warn(`Fetch exception on endpoint: ${lastError}. Trying next endpoint...`)
      }
    }

    if (!textResult) {
      throw new Error(`All Gemini API endpoints failed. Last response error: ${lastError}`)
    }

    const cleanedResult = textResult.trim().replace(/\s+/g, ' ')
    console.log(`Successfully scanned ingredients using endpoint [${successfulUrl}]:`, cleanedResult)

    return {
      success: true,
      ingredients: cleanedResult
    }
  } catch (error: any) {
    console.error("Error in scanFridgeWithGemini action:", error)
    return {
      success: false,
      error: error.message || "Failed to process the image with Gemini API."
    }
  }
}

export async function createRecipe(data: any) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Ensure profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.from('profiles').insert({ id: user.id })
  }

  const { title, ingredients, instructions, image_url, is_public } = data

  const { data: insertedData, error } = await supabase.from('recipes').insert({
    title,
    ingredients,
    instructions,
    image_url,
    is_public: is_public ?? false,
    user_id: user.id
  }).select()

  const newRecipe = insertedData?.[0]
  
  revalidatePath('/dashboard')
  revalidatePath('/recipes')
  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, recipe: newRecipe }
}
export async function toggleFavorite(recipeId: string, isFavorite: boolean) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: true } // Return success in demo mode

  // 1. Validate UUID structure to prevent Postgres cast errors on mock IDs
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeId)
  if (!isUuid) {
    return { success: true } // Return success for offline mock interactions
  }

  // 2. Fetch recipe ownership
  const { data: existing } = await supabase
    .from('recipes')
    .select('id, user_id')
    .eq('id', recipeId)
    .maybeSingle()

  if (existing && existing.user_id !== user.id) {
    if (isFavorite) {
      const { data: fullRecipe } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single()

      if (fullRecipe) {
        const { error: insertError } = await supabase.from('recipes').insert({
          title: fullRecipe.title,
          ingredients: fullRecipe.ingredients,
          instructions: fullRecipe.instructions,
          image_url: fullRecipe.image_url,
          is_public: true,
          user_id: user.id,
          difficulty: fullRecipe.difficulty,
          prep_time: fullRecipe.prep_time,
          diet: fullRecipe.diet,
          is_ai_generated: fullRecipe.is_ai_generated
        })
        if (insertError) return { error: insertError.message }
      }
    } else {
      const { data: fullRecipe } = await supabase
        .from('recipes')
        .select('title')
        .eq('id', recipeId)
        .single()
      
      if (fullRecipe) {
        await supabase
          .from('recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('title', fullRecipe.title)
      }
    }
    return { success: true }
  }

  // 3. Update owned recipe
  const { error } = await supabase
    .from('recipes')
    .update({ is_public: isFavorite })
    .eq('id', recipeId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      recipes: [
        {
          id: 'demo-history-1',
          title: 'Pan-Seared Salmon with Asparagus',
          ingredients: [
            { item: 'Salmon Fillet', qty: '200g' },
            { item: 'Asparagus', qty: '1 bunch' },
            { item: 'Lemon', qty: '1' },
            { item: 'Garlic', qty: '2 cloves' }
          ],
          instructions: [
            'Season salmon with salt, pepper, and lemon juice.',
            'Sear salmon in a hot pan for 4 minutes each side.',
            'Sauté asparagus with minced garlic in butter.'
          ],
          image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=1200',
          prep_time: 20,
          difficulty: 'Intermediate',
          meal_type: 'Dinner',
          diet: 'Gluten-Free'
        }
      ]
    }
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { recipes: data }
}

export async function getFavorites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      recipes: [
        {
          id: 'demo-favorite-1',
          title: 'Truffle Mushroom Risotto',
          ingredients: [
            { item: 'Arborio Rice', qty: '1 cup' },
            { item: 'Mushrooms', qty: '150g' },
            { item: 'Truffle Oil', qty: '1 tsp' },
            { item: 'Parmesan Cheese', qty: '50g' }
          ],
          instructions: [
            'Sauté mushrooms with olive oil until golden.',
            'Toast Arborio rice, then slowly add hot vegetable broth step-by-step.',
            'Stir in butter, grated Parmesan, and drizzle with truffle oil.'
          ],
          image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=1200',
          prep_time: 30,
          difficulty: 'Advanced',
          meal_type: 'Dinner',
          diet: 'Vegetarian'
        }
      ]
    }
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { recipes: data }
}
