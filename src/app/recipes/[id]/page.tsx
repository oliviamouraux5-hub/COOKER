'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChefHat, ChevronLeft, Heart, Play, Plus, Share2, Timer, Utensils, Volume2, VolumeX, ShoppingBasket, MapPin } from 'lucide-react'
import Link from 'next/link'
import ShoppingListModal from '@/components/shopping/ShoppingListModal'
import { toast } from 'sonner'
import { getFridgeItems, type FridgeItem } from '@/lib/actions/fridge'

const getRealisticFoodFallback = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes('pasta') || t.includes('noodle') || t.includes('spaghetti') || t.includes('lasagna')) {
    return "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('salad') || t.includes('lettuce') || t.includes('avocado') || t.includes('green') || t.includes('vegetable')) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('chicken') || t.includes('poultry') || t.includes('turkey') || t.includes('wings')) {
    return "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('salmon') || t.includes('fish') || t.includes('tuna') || t.includes('shrimp') || t.includes('seafood')) {
    return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('steak') || t.includes('beef') || t.includes('ribeye') || t.includes('pork') || t.includes('lamb') || t.includes('meat')) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('soup') || t.includes('stew') || t.includes('broth') || t.includes('ramen')) {
    return "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('dessert') || t.includes('cake') || t.includes('sweet') || t.includes('cookie') || t.includes('chocolate') || t.includes('pastry')) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200";
  }
  if (t.includes('egg') || t.includes('omelet') || t.includes('scramble') || t.includes('breakfast')) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=1200";
  }
  return "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200";
}

export default function RecipeDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient() as any
  const [speakingStep, setSpeakingStep] = useState<number | null>(null)
  const [availableWords, setAvailableWords] = useState<string[]>([])

  useEffect(() => {
    async function loadAvailableIngredients() {
      if (typeof window === 'undefined') return
      const isDemo = document.cookie.includes('cooker_session=demo')
      
      let items: FridgeItem[] = []
      
      if (isDemo) {
        const local = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
        items = JSON.parse(local)
      } else {
        try {
          const res = await getFridgeItems()
          if (res.migrationNeeded || !res.items) {
            const local = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
            items = JSON.parse(local)
          } else {
            items = res.items
          }
        } catch {
          const local = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
          items = JSON.parse(local)
        }
      }

      // Map item names to lowercase pool of phrases
      const words = items.map(item => item.name.toLowerCase()).filter(Boolean)

      // 1. Append checked pantry ingredients
      try {
        const pantryLocal = localStorage.getItem('cooker_pantry')
        if (pantryLocal) {
          const pantryObj = JSON.parse(pantryLocal)
          Object.keys(pantryObj).forEach(key => {
            if (pantryObj[key]) {
              words.push(key.toLowerCase())
            }
          })
        }
      } catch (err) {
        console.error("Failed to parse local pantry stock:", err)
      }

      // 2. Append custom staples
      try {
        const staplesLocal = localStorage.getItem('cooker_custom_staples')
        if (staplesLocal) {
          const staplesArr = JSON.parse(staplesLocal)
          if (Array.isArray(staplesArr)) {
            staplesArr.forEach((s: string) => {
              words.push(s.toLowerCase())
            })
          }
        }
      } catch (err) {
        console.error("Failed to parse custom staples:", err)
      }

      // 3. Append discovery search box ingredients (typed search ingredients)
      try {
        const typedLocal = localStorage.getItem('cooker_ingredients')
        if (typedLocal) {
          typedLocal.split(',').forEach((ing: string) => {
            const clean = ing.trim().toLowerCase()
            if (clean) words.push(clean)
          })
        }
      } catch (err) {
        console.error("Failed to parse typed ingredients:", err)
      }

      setAvailableWords(Array.from(new Set(words)))
    }

    loadAvailableIngredients()
  }, [])

  const isMissing = (item: string) => {
    if (availableWords.length === 0) return true // assume missing until loaded
    const itemLower = item.toLowerCase()
    
    // Robust match: Check if recipe item contains our shelf word,
    // OR if our shelf word contains/exactly matches the recipe item.
    const matchesAny = availableWords.some(word => {
      const cleanWord = word.trim()
      if (!cleanWord) return false
      return itemLower.includes(cleanWord) || cleanWord.includes(itemLower)
    })
    return !matchesAny
  }

  const speak = (text: string, index: number) => {
    if (typeof window === 'undefined') return
    
    window.speechSynthesis.cancel()
    
    if (speakingStep === index) {
      setSpeakingStep(null)
      return
    }

    // Storyteller Script Enrichment: Give it a premium, encouraging chef personality!
    let intro = ""
    if (index === -1) {
      intro = `Alright, Chef! Let's listen to the entire guide for ${recipe?.title || 'your delicious recipe'}. Here is how it goes: `
    } else if (index === 0) {
      intro = "Welcome to the kitchen, Chef! Let's get started with step 1. "
    } else if (recipe && index === recipe.instructions.length - 1) {
      intro = "We are at the grand finale, Chef! Let's finish strong. "
    } else {
      const intros = [
        `Moving on to step ${index + 1}. Let's keep the magic going! `,
        `Alright, for step ${index + 1}, here is the plan. `,
        `Now, let's step up the flavor for phase ${index + 1}. `,
        `Excellent progress! Let's tackle step ${index + 1}. `
      ]
      intro = intros[index % intros.length]
    }

    // Clean text and inject culinary accents for maximum vocal cadence
    let cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\b(boil|sauté|sautè|bake|mix|stir|chop|slice|whisk|combine|heat|grill|season)\b/gi, 'gently $1')

    const finalSpeech = `${intro}${cleanText}. Take your time, focus on the details, and make it beautiful!`

    const utterance = new SpeechSynthesisUtterance(finalSpeech)
    utterance.onstart = () => setSpeakingStep(index)
    utterance.onend = () => setSpeakingStep(null)
    utterance.onerror = () => setSpeakingStep(null)
    
    // Find a premium, pleasing voice
    const voices = window.speechSynthesis.getVoices()
    const premiumVoices = ['Ava', 'Siri', 'Samantha', 'Google US English', 'Daniel', 'Premium']
    let bestVoice = voices.find(v => v.lang.startsWith('en') && premiumVoices.some(pv => v.name.includes(pv)))
    
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang.startsWith('en'))
    }

    if (bestVoice) {
      utterance.voice = bestVoice
      utterance.pitch = 1.15 // Enthusiastic storyteller
      utterance.rate = 1.02  // Beautifully paced narration
      utterance.volume = 1   // Warm and clear
    }
    
    window.speechSynthesis.speak(utterance)
  }

  // Ensure voices are loaded
  useEffect(() => {
    const loadVoices = () => { window.speechSynthesis.getVoices() }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  useEffect(() => {
    async function fetchRecipe() {
      const upgradeInstructions = (recipeObj: any) => {
        if (recipeObj && recipeObj.instructions && recipeObj.instructions[0] && recipeObj.instructions[0].includes("Step 1: Prep.")) {
          recipeObj.instructions = [
            `**Step 1: Prep and Mise en Place.** Carefully wash, chop, and measure your ingredients. Set them in individual small bowls to organize your cooking station.`,
            `**Step 2: Build the Flavor Base.** Heat 1 tablespoon of olive oil or butter in a pan over medium heat. Sauté the aromatics and core elements for 5-6 minutes until tender, lightly golden, and filled with a rich fragrance.`,
            `**Step 3: Simmer and Season.** Season your dish with a pinch of sea salt, black pepper, and your favorite dry herbs. Allow the flavors to meld together over low heat for 3-4 minutes.`,
            `**Step 4: Plate and Garnish.** Transfer your creation onto a warm plate. Garnish with a drizzle of extra virgin olive oil, fresh herbs, or a squeeze of lemon to make it look stunning before serving.`
          ]
        }
        return recipeObj
      }

      if (params.id === 'demo-active' && typeof window !== 'undefined') {
        const saved = localStorage.getItem('cooker_active_recipe')
        if (saved) {
          try {
            let parsed = JSON.parse(saved)
            parsed = upgradeInstructions(parsed)
            localStorage.setItem('cooker_active_recipe', JSON.stringify(parsed))
            setRecipe(parsed)
            setIsLoading(false)
            return
          } catch (e) {
            console.error("Failed to parse active demo recipe:", e)
          }
        }
      }

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (data) {
        let upgraded = upgradeInstructions(data)
        setRecipe(upgraded)
        setIsFavorite(!!upgraded.is_public)
      } else {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('cooker_active_recipe')
          if (saved) {
            try {
              let parsed = JSON.parse(saved)
              parsed = upgradeInstructions(parsed)
              setRecipe(parsed)
              setIsLoading(false)
              return
            } catch (e) {}
          }
        }
        // Mock fallback for direct navigation
        setRecipe({
          title: 'Summer Garden Pasta',
          ingredients: [
            { item: 'Pasta', qty: '200g' },
            { item: 'Tomatoes', qty: '3 large' },
            { item: 'Basil', qty: 'handful' }
          ],
          instructions: [
            'Boil pasta in salted water.',
            'Sauté chopped tomatoes in olive oil.',
            'Mix pasta with tomatoes and fresh basil.'
          ],
        })
      }
      setIsLoading(false)
    }

    fetchRecipe()
  }, [params.id])

  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-black text-3xl animate-pulse italic">Loading your masterpiece...</div>
  if (!recipe) return <div>Recipe not found</div>

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <ShoppingListModal 
        isOpen={isShoppingListOpen} 
        onClose={() => setIsShoppingListOpen(false)} 
        items={recipe.ingredients.map((ing: any) => ({
          ...ing,
          category: ['Produce', 'Dairy', 'Meat', 'Pantry', 'Spices'][Math.floor(Math.random() * 5)]
        }))}
      />
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="bg-white/50 backdrop-blur-md p-8 md:p-10 rounded-[3rem] shadow-premium border border-primary/5 space-y-6 animate-in fade-in slide-in-from-top-6 duration-500">
          {/* Top navigation row */}
          <div className="flex items-center justify-between pb-4 border-b border-muted/30">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push('/dashboard')} 
                className="text-foreground hover:bg-muted rounded-2xl h-12 w-12 flex items-center justify-center border border-muted"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <span className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] hidden sm:inline-block">Recipe details</span>
            </div>
            
            <Link href="/" className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-primary/20 hover:rotate-6 transition-transform">
              <ChefHat className="text-white w-6 h-6" />
            </Link>
          </div>

          {/* Majestic Title block */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight max-w-4xl">
              {recipe.title}
            </h1>
            <div className="flex flex-wrap gap-2.5">
              <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 text-sm font-black rounded-xl">15-20 mins</Badge>
              <Badge className="bg-secondary/10 text-secondary border-none px-4 py-1.5 text-sm font-black rounded-xl">Easy</Badge>
              {recipe.is_creative && (
                <Badge className="bg-purple-100 text-purple-700 border-none px-4 py-1.5 text-sm font-black rounded-xl animate-pulse">AI Generated</Badge>
              )}
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap gap-3.5 pt-4 border-t border-muted/30">
            <Button 
              variant="outline"
              size="icon"
              className={cn(
                "border-2 h-14 w-14 rounded-2xl group flex items-center justify-center shrink-0 transition-all",
                isFavorite 
                  ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100" 
                  : "border-muted text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50/30"
              )}
              onClick={async () => {
                if (!recipe?.id) return
                const newState = !isFavorite
                setIsFavorite(newState)
                
                const { error } = await supabase
                  .from('recipes')
                  .update({ is_public: newState })
                  .eq('id', recipe.id)

                if (error) {
                  setIsFavorite(!newState) // rollback
                  toast.error("Failed to update favorites")
                } else {
                  if (newState) {
                    toast.success("Added to favorites! ❤️")
                  } else {
                    toast.success("Removed from favorites 💔")
                  }
                }
              }}
            >
              <Heart className={cn("w-6 h-6 transition-all group-hover:scale-110", isFavorite ? "fill-current" : "")} />
            </Button>
            
            <Button 
              variant="outline"
              size="icon"
              className="border-2 border-muted h-14 w-14 rounded-2xl group flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: recipe.title,
                    text: `Check out this recipe: ${recipe.title}`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard!");
                }
              }}
            >
              <Share2 className="w-6 h-6" />
            </Button>

            <Button 
              variant="outline"
              className="border-2 border-primary text-primary font-black h-14 px-6 text-sm md:text-base rounded-2xl group flex items-center justify-center hover:bg-primary/5"
              onClick={() => setIsShoppingListOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
              Missing Items
            </Button>

            <Link 
              href={`/recipes/${params.id}/cook`}
              className={cn(
                buttonVariants({ variant: "default" }), 
                "bg-primary hover:bg-primary/95 text-white font-black h-14 px-8 text-sm md:text-base rounded-2xl shadow-lg shadow-primary/10 group flex items-center justify-center"
              )}
            >
              <Play className="w-4 h-4 mr-2 fill-current group-hover:scale-110 transition-transform" />
              Start Cooking
            </Link>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-premium bg-white p-4 rounded-[3rem] overflow-hidden">
              <div className="h-[400px] relative">
                <img 
                  src={recipe.image_url || getRealisticFoodFallback(recipe.title)} 
                  onError={(e) => {
                    e.currentTarget.src = getRealisticFoodFallback(recipe.title);
                  }}
                  className="w-full h-full object-cover"
                  alt={recipe.title}
                />
              </div>
              <CardHeader className="p-10">
                <CardTitle className="text-3xl font-black w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <ChefHat className="w-8 h-8" />
                      </div>
                      Step-by-Step Instructions
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary font-bold hover:bg-primary/5 rounded-xl gap-2"
                      onClick={() => {
                        const fullText = recipe.instructions.join('. ');
                        speak(fullText, -1);
                      }}
                    >
                      {speakingStep === -1 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      {speakingStep === -1 ? "Stop Listening" : "Listen All"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pb-10">
                <ol className="space-y-8">
                   {recipe.instructions.map((step: string, i: number) => (
                    <li key={i} className={cn(
                      "flex gap-6 items-start group p-6 rounded-[2rem] transition-all duration-500",
                      speakingStep === i ? "bg-primary/5 shadow-inner scale-[1.02]" : "hover:bg-muted/30"
                    )}>
                      <span className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-500",
                        speakingStep === i ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-muted text-foreground group-hover:bg-primary group-hover:text-white"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 space-y-4">
                        <p className={cn(
                          "text-lg font-medium leading-relaxed transition-colors",
                          speakingStep === i ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.replace(/\*\*/g, '')}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "rounded-xl gap-2 font-bold transition-all",
                            speakingStep === i ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100"
                          )}
                          onClick={() => speak(step, i)}
                        >
                          {speakingStep === i ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          {speakingStep === i ? "Stop" : "Listen to Step"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-premium bg-white p-2 rounded-[2.5rem]">
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <Utensils className="w-6 h-6 text-secondary" />
                  Ingredients
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <ul className="space-y-4">
                  {[...recipe.ingredients]
                    .sort((a, b) => {
                      const aMissing = isMissing(a.item)
                      const bMissing = isMissing(b.item)
                      if (aMissing && !bMissing) return -1
                      if (!aMissing && bMissing) return 1
                      return 0
                    })
                    .map((ing: any, i: number) => {
                      const missing = isMissing(ing.item)
                    return (
                      <li 
                        key={i} 
                        className={cn(
                          "flex justify-between items-center p-4 rounded-2xl font-bold border transition-all",
                          missing 
                            ? "bg-red-50/65 text-red-700 border-red-200/50 hover:border-red-300 shadow-sm" 
                            : "bg-muted/30 text-foreground border-transparent hover:border-primary/20"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn(missing ? "text-red-700/80 font-black" : "text-foreground/70")}>{ing.item}</span>
                          {missing && (
                            <span className="text-[9px] bg-red-100/90 text-red-700 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-red-200/50 animate-pulse">
                              Missing
                            </span>
                          )}
                        </span>
                        <span className={cn(
                          "px-3 py-1 rounded-xl shadow-sm border text-sm font-black",
                          missing 
                            ? "bg-white text-red-600 border-red-100" 
                            : "bg-white text-primary border-transparent"
                        )}>
                          {ing.qty}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
