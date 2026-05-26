import * as z from 'zod'

export const profileSchema = z.object({
  dietary_preferences: z.object({
    vegan: z.boolean(),
    gluten_free: z.boolean(),
    vegetarian: z.boolean(),
    keto: z.boolean(),
  }),
  allergies: z.array(z.string()),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
