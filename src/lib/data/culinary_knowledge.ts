export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert' | 'Appetizer' | 'All';

export const INGREDIENT_MEAL_MAP: Record<string, MealType[]> = {
  // Proteins
  'chicken': ['Lunch', 'Dinner'],
  'beef': ['Lunch', 'Dinner'],
  'steak': ['Dinner'],
  'salmon': ['Lunch', 'Dinner'],
  'shrimp': ['Lunch', 'Dinner', 'Appetizer'],
  'pork': ['Lunch', 'Dinner'],
  'tofu': ['Lunch', 'Dinner'],
  'egg': ['Breakfast', 'Lunch', 'Dinner'],
  'bacon': ['Breakfast', 'Lunch', 'Dinner'],
  'ham': ['Breakfast', 'Lunch'],
  
  // Fruits
  'strawberry': ['Breakfast', 'Dinner', 'Dessert'], // Dinner for salads
  'blueberry': ['Breakfast', 'Dessert'],
  'banana': ['Breakfast', 'Dessert'],
  'apple': ['Breakfast', 'Lunch', 'Dinner', 'Dessert'],
  'lemon': ['All'],
  'lime': ['All'],
  'avocado': ['Breakfast', 'Lunch', 'Dinner'],
  'pineapple': ['Breakfast', 'Dinner', 'Dessert'],
  
  // Vegetables
  'tomato': ['Breakfast', 'Lunch', 'Dinner'],
  'spinach': ['Breakfast', 'Lunch', 'Dinner'],
  'broccoli': ['Lunch', 'Dinner'],
  'carrot': ['Lunch', 'Dinner', 'Dessert'], // Carrot cake!
  'onion': ['Breakfast', 'Lunch', 'Dinner'],
  'garlic': ['Lunch', 'Dinner'],
  'potato': ['Breakfast', 'Lunch', 'Dinner'],
  'sweet potato': ['Breakfast', 'Lunch', 'Dinner', 'Dessert'],
  'cucumber': ['Lunch', 'Dinner'],
  'mushroom': ['Breakfast', 'Lunch', 'Dinner'],
  
  // Pantry & Sweets
  'chocolate': ['Dessert'],
  'sugar': ['Breakfast', 'Dessert'],
  'flour': ['All'],
  'pasta': ['Lunch', 'Dinner'],
  'rice': ['Lunch', 'Dinner'],
  'honey': ['Breakfast', 'Dessert', 'Dinner'], // Honey glaze
  'maple syrup': ['Breakfast', 'Dessert'],
  'olive oil': ['All'],
  'butter': ['All'],
  'milk': ['Breakfast', 'Dessert'],
  'yogurt': ['Breakfast', 'Dessert']
};

export const getCompatibleIngredients = (mealType: MealType): string[] => {
  if (mealType === 'All') return Object.keys(INGREDIENT_MEAL_MAP);
  return Object.keys(INGREDIENT_MEAL_MAP).filter(ing => 
    INGREDIENT_MEAL_MAP[ing].includes(mealType)
  );
};
