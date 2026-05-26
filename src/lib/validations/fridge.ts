import * as z from 'zod'

export const fridgeSchema = z.object({
  ingredients: z.string().optional(),
  prepTime: z.string().optional(),
  difficulty: z.string().optional(),
  mealType: z.string().optional(),
  diet: z.string().optional(),
  isCreative: z.boolean().optional(),
  isStrict: z.boolean().optional(),
  creativeType: z.enum(['strict', 'gourmet']).optional(),
  pantry: z.record(z.string(), z.boolean()).optional(),
})

export type FridgeFormValues = z.infer<typeof fridgeSchema>
