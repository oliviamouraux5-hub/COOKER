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
  'teaspoon', 'teaspoons'
])

export function ingredientsMatch(recipeIng: string, userIng: string): boolean {
  const cleanRecipe = recipeIng.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const cleanUser = userIng.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  
  const recipeTokens = cleanRecipe.split(/\s+/).filter(w => w.length > 2 && !IGNORED_MODIFIERS.has(w))
  const userTokens = cleanUser.split(/\s+/).filter(w => w.length > 2 && !IGNORED_MODIFIERS.has(w))
  
  if (recipeTokens.length === 0 || userTokens.length === 0) {
    return cleanRecipe.includes(cleanUser) || cleanUser.includes(cleanRecipe)
  }
  
  return recipeTokens.some(rt => userTokens.some(ut => rt.includes(ut) || ut.includes(rt)))
}
