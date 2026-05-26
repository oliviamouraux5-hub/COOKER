'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormValues } from '@/lib/validations/profile'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChefHat, Loader2, X, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfileSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [allergyInput, setAllergyInput] = useState('')
  const supabase = createClient() as any

  const { setValue, watch, handleSubmit } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      dietary_preferences: {
        vegan: false,
        gluten_free: false,
        vegetarian: false,
        keto: false,
      },
      allergies: [],
    }
  })

  const dietPrefs = watch('dietary_preferences')
  const allergies = watch('allergies')

  const addAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      const newAllergies = [...allergies, allergyInput.trim()]
      setValue('allergies', newAllergies)
      setAllergyInput('')
    }
  }

  const removeAllergy = (allergy: string) => {
    const newAllergies = allergies.filter(a => a !== allergy)
    setValue('allergies', newAllergies)
  }

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not found')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          dietary_preferences: data.dietary_preferences,
          allergies: data.allergies,
        })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Profile updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-none shadow-premium bg-white p-4 rounded-[3rem] animate-in fade-in zoom-in duration-700">
        <CardHeader className="p-8 text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-6">
            <Sparkles className="w-10 h-10" />
          </div>
          <CardTitle className="text-4xl font-black text-foreground">Set Your <span className="text-primary">Preferences</span></CardTitle>
          <CardDescription className="text-lg font-medium text-muted-foreground">Help your AI chef tailor recipes to your unique taste and needs.</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="p-8 pt-0 space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-xl text-secondary">
                  <ChefHat className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-foreground">Dietary Style</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(dietPrefs).map((diet) => (
                  <div key={diet} className="flex items-center space-x-4 bg-muted/30 p-6 rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                    <Checkbox 
                      id={diet} 
                      checked={(dietPrefs as any)[diet]}
                      onCheckedChange={(checked) => {
                        setValue(`dietary_preferences.${diet}` as any, checked)
                      }}
                      className="w-6 h-6 rounded-lg border-primary data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor={diet} className="capitalize cursor-pointer text-lg font-bold group-hover:text-primary transition-colors">
                      {diet.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <X className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-foreground">Allergies & Avoidances</h3>
              </div>
              <div className="flex gap-4">
                <Input
                  placeholder="e.g. Peanuts, Shellfish..."
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  className="h-16 bg-muted/50 border-none rounded-2xl px-6 text-lg font-medium focus:ring-2 focus:ring-primary/20"
                />
                <Button 
                  type="button" 
                  onClick={addAllergy}
                  className="bg-primary hover:bg-primary/90 text-white h-16 w-16 rounded-2xl shadow-lg shadow-primary/20"
                >
                  <Plus className="w-8 h-8" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 min-h-[60px] p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10">
                {allergies.map((allergy) => (
                  <Badge key={allergy} className="bg-white text-foreground shadow-premium hover:bg-red-50 hover:text-red-600 px-6 py-3 rounded-2xl text-lg font-bold flex items-center gap-3 border-none group transition-all">
                    {allergy}
                    <button type="button" onClick={() => removeAllergy(allergy)} className="text-muted-foreground group-hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </Badge>
                ))}
                {allergies.length === 0 && (
                  <p className="text-lg text-muted-foreground/40 font-medium italic py-2">No allergies listed yet.</p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-8 pt-0">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white py-10 text-2xl rounded-3xl shadow-2xl shadow-primary/20 font-black transition-all hover:-translate-y-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                'Save & Enter Kitchen'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
