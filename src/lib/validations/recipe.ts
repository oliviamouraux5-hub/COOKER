import * as z from 'zod'

export const recipeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  ingredients: z.array(z.object({
    item: z.string().min(1, 'Item name is required'),
    qty: z.string().min(1, 'Quantity is required'),
  })).min(1, 'At least one ingredient is required'),
  instructions: z.array(z.string().min(1, 'Instruction cannot be empty')).min(1, 'At least one instruction is required'),
  is_public: z.boolean(),
  image_url: z.string().optional(),
})

export type RecipeFormValues = z.infer<typeof recipeSchema>
