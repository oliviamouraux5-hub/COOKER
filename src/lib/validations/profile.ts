import * as z from 'zod'

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  avatar_url: z.string().optional().or(z.literal('')),
  dietary_preferences: z.object({
    vegan: z.boolean().optional(),
    gluten_free: z.boolean().optional(),
    vegetarian: z.boolean().optional(),
    keto: z.boolean().optional(),
    cooking_level: z.string().optional(),
  }),
  allergies: z.array(z.string()),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
