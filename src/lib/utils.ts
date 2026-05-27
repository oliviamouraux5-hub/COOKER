import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const IGNORED_MODIFIERS = new Set([
  'fresh', 'organic', 'baby', 'leaves', 'powder', 'clove', 'cloves', 'unsalted', 'salted',
  'ground', 'pieces', 'sliced', 'chopped', 'diced', 'minced', 'whole', 'crushed',
  'large', 'medium', 'small', 'shredded', 'grated', 'dried', 'dry', 'raw', 'cooked',
  'extra', 'virgin', 'pure', 'natural', 'sweet', 'hot', 'spicy', 'cold',
  'juice', 'oil', 'sauce', 'cream', 'wine', 'water', 'extract', 'flavor', 'flavored',
  'package', 'box', 'can', 'cans', 'bottle', 'bottles', 'cup', 'cups', 'ounce', 'ounces',
  'pound', 'pounds', 'taste', 'additional', 'style', 'tbsp', 'tsp', 'tablespoon', 'tablespoons',
  'teaspoon', 'teaspoons',
  'green', 'red', 'white', 'black', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gold',
  'sour', 'bitter', 'kosher', 'sea', 'pickled', 'canned', 'frozen', 'vegetable', 'vegetables',
  'fruit', 'fruits', 'meat', 'meats'
])

export function wordsArePluralOfEachOther(w1: string, w2: string): boolean {
  if (w1 === w2) return true
  
  // Plural checks (e.g. s, es)
  if (w1 === w2 + 's' || w2 === w1 + 's') return true
  if (w1 === w2 + 'es' || w2 === w1 + 'es') return true
  
  // y/ies plural checks (e.g. strawberry/strawberries)
  const cleanW1 = w1.replace(/ies$/, 'y')
  const cleanW2 = w2.replace(/ies$/, 'y')
  if (cleanW1 === cleanW2) return true
  
  return false
}

export function ingredientsMatch(recipeIng: string, userIng: string): boolean {
  const cleanRecipe = recipeIng.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const cleanUser = userIng.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  
  if (!cleanRecipe || !cleanUser) return false
  
  const recipeTokens = cleanRecipe.split(/\s+/).filter(w => w.length > 2 && !IGNORED_MODIFIERS.has(w))
  const userTokens = cleanUser.split(/\s+/).filter(w => w.length > 2 && !IGNORED_MODIFIERS.has(w))
  
  if (recipeTokens.length === 0 || userTokens.length === 0) {
    if (cleanRecipe.length <= 2 || cleanUser.length <= 2) return false
    return wordsArePluralOfEachOther(cleanRecipe, cleanUser)
  }
  
  return recipeTokens.some(rt => userTokens.some(ut => wordsArePluralOfEachOther(rt, ut)))
}
