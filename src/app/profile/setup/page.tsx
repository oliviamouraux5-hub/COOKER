'use client'

import { useState, useEffect } from 'react'
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
import { ChefHat, Loader2, X, Plus, Sparkles, User, Camera, Upload, ArrowLeft, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const AVATAR_TEMPLATES = ['🧑‍🍳', '👨‍🍳', '👩‍🍳', '👵', '🥑', '🍣']

export default function ProfileSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [allergyInput, setAllergyInput] = useState('')
  const supabase = createClient() as any

  const handleLogout = async () => {
    try {
      document.cookie = 'cooker_session=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
      localStorage.removeItem('cooker_staged_profile')
      localStorage.removeItem('cooker_onboarding_completed')
      await supabase.auth.signOut()
      toast.success("Logged out successfully! See you soon, Chef! 👋")
      window.location.href = '/'
    } catch (err) {
      console.error("Logout caught error:", err)
      window.location.href = '/'
    }
  }

  const { register, setValue, watch, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      avatar_url: '🧑‍🍳',
      dietary_preferences: {
        vegan: false,
        gluten_free: false,
        vegetarian: false,
        keto: false,
        cooking_level: 'intermediate',
      },
      allergies: [],
    }
  })

  const dietPrefs = watch('dietary_preferences')
  const allergies = watch('allergies')
  const avatarUrl = watch('avatar_url')
  const fullName = watch('full_name')

  // Load existing profile values if logged in
  useEffect(() => {
    async function loadProfile() {
      const isDemo = typeof document !== 'undefined' && document.cookie.includes('cooker_session=demo')
      
      if (isDemo) {
        try {
          const stored = localStorage.getItem('cooker_demo_profile')
          if (stored) {
            const profile = JSON.parse(stored)
            reset({
              full_name: profile.full_name || '',
              avatar_url: profile.avatar_url || '🧑‍🍳',
              dietary_preferences: {
                vegan: !!profile.dietary_preferences?.vegan,
                gluten_free: !!profile.dietary_preferences?.gluten_free,
                vegetarian: !!profile.dietary_preferences?.vegetarian,
                keto: !!profile.dietary_preferences?.keto,
                cooking_level: profile.dietary_preferences?.cooking_level || 'intermediate',
              },
              allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
            })
          }
        } catch (e) {
          console.error('Failed to load local demo profile:', e)
        } finally {
          setIsFetching(false)
        }
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsFetching(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          reset({
            full_name: profile.full_name || profile.username || '',
            avatar_url: profile.avatar_url || '🧑‍🍳',
            dietary_preferences: {
              vegan: !!profile.dietary_preferences?.vegan,
              gluten_free: !!profile.dietary_preferences?.gluten_free,
              vegetarian: !!profile.dietary_preferences?.vegetarian,
              keto: !!profile.dietary_preferences?.keto,
              cooking_level: profile.dietary_preferences?.cooking_level || 'intermediate',
            },
            allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
          })
        }
      } catch (e) {
        console.error('Error fetching profile:', e)
      } finally {
        setIsFetching(false)
      }
    }
    loadProfile()
  }, [supabase, reset])

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

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.')
      return
    }

    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Image size must be less than 1.5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setValue('avatar_url', reader.result as string)
      toast.success('Custom profile picture loaded!')
    }
    reader.onerror = () => {
      toast.error('Failed to read image.')
    }
    reader.readAsDataURL(file)
  }

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('cooker_session=demo')
    
    if (isDemo) {
      try {
        localStorage.setItem('cooker_demo_profile', JSON.stringify({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          dietary_preferences: data.dietary_preferences,
          allergies: data.allergies,
        }))
        toast.success('Local demo profile updated successfully!')
        router.push('/dashboard')
      } catch (e) {
        toast.error('Failed to save demo profile')
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Staged profile helper for new unconfirmed signups
        localStorage.setItem('cooker_staged_profile', JSON.stringify({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          dietary_preferences: data.dietary_preferences,
          allergies: data.allergies,
        }))
        toast.success('Kitchen profile saved! Welcome to COOKER!')
        router.push('/dashboard')
        return
      }

      // Upsert profile data using only guaranteed pre-existing columns to prevent PostgREST schema cache errors!
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: data.full_name || user.email?.split('@')[0],
          full_name: data.full_name,
          avatar_url: data.avatar_url,
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

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-black text-muted-foreground uppercase tracking-wider">Loading your kitchen preferences...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 flex items-center justify-center relative selection:bg-primary/10">
      <Link 
        href="/dashboard" 
        className="absolute top-8 left-8 p-3 rounded-full bg-white shadow-premium border border-primary/5 hover:scale-105 active:scale-95 duration-200 text-muted-foreground hover:text-primary transition-all flex items-center gap-2 text-xs font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <Card className="w-full max-w-2xl border-none shadow-premium bg-white p-4 rounded-[3rem] animate-in fade-in zoom-in duration-500">
        <CardHeader className="p-8 text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-6">
            <Sparkles className="w-10 h-10" />
          </div>
          <CardTitle className="text-4xl font-black text-foreground">Set Your <span className="text-primary">Profile</span></CardTitle>
          <CardDescription className="text-sm font-semibold text-muted-foreground">Tailor your premium personal chef profile and cooking avoidances.</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="p-8 pt-0 space-y-10">
            {/* AVATAR SELECTOR & FULL NAME GRID */}
            <div className="bg-muted/20 p-6 rounded-[2.5rem] border border-primary/5 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Circular Preview */}
                <div className="relative w-24 h-24 rounded-full bg-white border-2 border-primary/20 shadow-premium flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') ? (
                      <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl select-none">{avatarUrl}</span>
                    )
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                  <label htmlFor="custom-avatar" className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                  </label>
                  <input
                    id="custom-avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    className="hidden"
                  />
                </div>

                {/* Name and Quick Templates Selector */}
                <div className="space-y-4 w-full">
                  <div className="space-y-1">
                    <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Display Name</Label>
                    <Input
                      id="full_name"
                      placeholder="e.g. Olivia Mouraux"
                      {...register('full_name')}
                      className="h-12 bg-white border border-primary/10 rounded-xl px-4 text-xs font-semibold focus:ring-2 focus:ring-primary/20 text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1">Quick Avatar Template</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {AVATAR_TEMPLATES.map((avatar) => (
                        <button
                          key={avatar}
                          type="button"
                          onClick={() => setValue('avatar_url', avatar)}
                          className={`w-10 h-10 rounded-xl bg-white border-2 flex items-center justify-center text-xl shadow-sm hover:scale-105 active:scale-95 duration-200 transition-all ${
                            avatarUrl === avatar ? 'border-primary bg-primary/5 scale-105' : 'border-primary/5 hover:border-primary/20'
                          }`}
                        >
                          {avatar}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => document.getElementById('custom-avatar')?.click()}
                        className="h-10 px-3 rounded-xl bg-white border border-dashed border-primary/20 flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Custom Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>



            {/* ALLERGIES & AVOIDANCES */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <X className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Allergies & Avoidances</h3>
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g. Peanuts, Shellfish..."
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  className="h-12 bg-muted/30 border-none rounded-xl px-4 text-xs font-semibold focus:ring-2 focus:ring-primary/20 text-foreground"
                />
                <Button 
                  type="button" 
                  onClick={addAllergy}
                  className="bg-primary hover:bg-primary/90 text-white h-12 px-5 rounded-xl shadow-md shadow-primary/25"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-muted/20 rounded-2xl border border-dashed border-primary/10">
                {allergies.map((allergy) => (
                  <Badge key={allergy} className="bg-white text-foreground shadow-sm hover:bg-red-50 hover:text-red-600 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border-none group transition-all">
                    {allergy}
                    <button type="button" onClick={() => removeAllergy(allergy)} className="text-muted-foreground group-hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
                {allergies.length === 0 && (
                  <p className="text-xs text-muted-foreground/40 font-semibold italic py-1">No allergies listed yet.</p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-4 w-full">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-white py-6 text-lg rounded-2xl shadow-xl shadow-primary/25 font-black transition-all hover:-translate-y-0.5 active:scale-95 duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                'Save Preferences'
              )}
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white py-6 px-8 text-lg rounded-2xl font-black transition-all duration-200 border-none cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
