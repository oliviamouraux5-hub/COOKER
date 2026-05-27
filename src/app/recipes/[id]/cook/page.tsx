'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChefHat, ChevronLeft, ChevronRight, CheckCircle2, Timer, Volume2, VolumeX, Star, Camera, Share2, Trophy, Sparkles, X, Sliders, Music, Upload, Play, Pause, ShoppingCart, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, ingredientsMatch } from '@/lib/utils'
import { getFridgeItems, toggleRestockItem, deleteFridgeItem, type FridgeItem } from '@/lib/actions/fridge'

export default function CookingModePage() {
  const params = useParams()
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient() as any
  const [availableWords, setAvailableWords] = useState<string[]>([])

  // Dynamic celebration states
  const [showCelebration, setShowCelebration] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [creationImage, setCreationImage] = useState<string | null>(null)

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1: return "Needs work"
      case 2: return "Getting there 👍"
      case 3: return "Tasty creation! 😋"
      case 4: return "Absolutely delicious! ❤️"
      case 5: return "A culinary masterpiece!"
      default: return "Rate your creation!"
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCreationImage(reader.result as string)
        toast.success("Culinary snapshot loaded! 📸")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleShareAchievement = () => {
    const ratingStars = "⭐".repeat(rating || 5)
    const text = `I just cooked "${recipe?.title}" on Cooker! It turned out absolutely amazing and I rated it ${ratingStars}. Check it out!`
    
    if (navigator.share) {
      navigator.share({
        title: "My Cooking Achievement!",
        text: text,
        url: window.location.href.replace('/cook', '')
      }).then(() => {
        toast.success("Shared successfully! 🎉")
      }).catch(() => {
        navigator.clipboard.writeText(text)
        toast.success("Share card copied to clipboard! 📋")
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Share card copied to clipboard! 📋")
    }
  }

  const deductIngredientsFromFridge = async () => {
    if (!recipe || !recipe.ingredients) return

    try {
      const isDemo = typeof document !== 'undefined' && document.cookie.includes('cooker_session=demo')
      let items: FridgeItem[] = []
      
      let isLocalStorageUsed = isDemo
      
      // 1. Fetch current fridge items
      if (isDemo) {
        const local = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
        items = JSON.parse(local)
      } else {
        const res = await getFridgeItems()
        if (res.items && !res.migrationNeeded) {
          items = res.items
        } else {
          const local = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
          items = JSON.parse(local)
          isLocalStorageUsed = true
        }
      }

      // 2. Identify which fridge items match the recipe ingredients
      const itemsToDelete: FridgeItem[] = []
      recipe.ingredients.forEach((ing: any) => {
        const ingName = ing.item.toLowerCase().trim()
        if (!ingName) return

        // Look for matching fridge item using our mathematically perfect global matching rules!
        const match = items.find(item => ingredientsMatch(ing.item, item.name))

        if (match && !itemsToDelete.some(it => it.id === match.id)) {
          // Keep dry pantry closet staples (like olive oil or spices) in the cabinet, only deduct perishable refrigerated items!
          if (match.category?.toLowerCase().trim() !== 'pantry') {
            itemsToDelete.push(match)
          }
        }
      })

      if (itemsToDelete.length === 0) return

      // 3. Deduct/Delete the matched items
      if (isLocalStorageUsed) {
        const remaining = items.filter(item => !itemsToDelete.some(it => it.id === item.id))
        localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(remaining))
      }
      
      if (!isDemo) {
        // Delete each natively in Supabase database for any real DB items!
        for (const item of itemsToDelete) {
          if (item.id && !item.id.startsWith('demo-')) {
            await deleteFridgeItem(item.id)
          }
        }
      }

      // 4. Notify user with a gorgeous toast listing what was consumed
      const namesList = itemsToDelete.map(it => it.name).join(', ')
      toast.info(`Consumed from your fridge: ${namesList} 🍳`, {
        duration: 4000
      })
    } catch (err) {
      console.error("Failed to auto-deduct ingredients:", err)
    }
  }

  const handleCompleteAll = async () => {
    await deductIngredientsFromFridge()
    toast.success("Cooking completed! 🥳")
    window.location.href = '/dashboard'
  }

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
    return !availableWords.some(word => ingredientsMatch(item, word))
  }

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

      const { data } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (data) {
        let upgraded = upgradeInstructions(data)
        setRecipe(upgraded)
      } else {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('cooker_active_recipe')
          if (saved) {
            try {
              let parsed = JSON.parse(saved)
              parsed = upgradeInstructions(parsed)
              setRecipe(parsed)
            } catch (e) {}
          }
        }
      }
      setIsLoading(false)
    }

    fetchRecipe()
  }, [params.id])

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  // Voice Narrator Custom Settings
  const [voicesList, setVoicesList] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("")
  const [voicePitch, setVoicePitch] = useState<number>(1.1)
  const [voiceRate, setVoiceRate] = useState<number>(1.0)

  // Ambient Kitchen Music Controls
  const bgAudioRef = useRef<HTMLAudioElement | null>(null)
  const [bgMusicPlaying, setBgMusicPlaying] = useState<boolean>(false)
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(0.15)
  const [bgTrackName, setBgTrackName] = useState<string>("No ambient track loaded")

  // Load and populate available system voices
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices()
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'))
      setVoicesList(englishVoices.length > 0 ? englishVoices : allVoices)
      
      // Select the best voice by default
      const premiumNames = ['Ava', 'Siri', 'Samantha', 'Google US English', 'Daniel']
      const best = englishVoices.find(v => premiumNames.some(pv => v.name.includes(pv)))
      if (best) {
        setSelectedVoiceName(best.name)
      } else if (englishVoices.length > 0) {
        setSelectedVoiceName(englishVoices[0].name)
      } else if (allVoices.length > 0) {
        setSelectedVoiceName(allVoices[0].name)
      }
    }
    
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  const speak = (text: string, stepIndex: number) => {
    if (typeof window === 'undefined') return

    window.speechSynthesis.cancel()

    // Storyteller Script Enrichment
    let intro = ""
    if (stepIndex === 0) {
      intro = "Welcome to the kitchen, Chef! Let's get started with step 1. "
    } else if (stepIndex === recipe.instructions.length - 1) {
      intro = "We are at the grand finale, Chef! Let's finish strong. "
    } else {
      const intros = [
        `Moving on to step ${stepIndex + 1}. Let's keep the magic going! `,
        `Alright, for step ${stepIndex + 1}, here is the plan. `,
        `Now, let's step up the flavor for phase ${stepIndex + 1}. `,
        `Excellent progress! Let's tackle step ${stepIndex + 1}. `
      ]
      intro = intros[stepIndex % intros.length]
    }

    let cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\b(boil|sauté|sautè|bake|mix|stir|chop|slice|whisk|combine|heat|grill|season)\b/gi, 'gently $1')
      
    const finalSpeech = `${intro}${cleanText}. Take your time, focus on the details, and make it beautiful!`

    const utterance = new SpeechSynthesisUtterance(finalSpeech)
    
    utterance.onstart = () => {
      setIsSpeaking(true)
      // DUCK background music volume when speaking starts!
      if (bgAudioRef.current && bgMusicPlaying) {
        bgAudioRef.current.volume = bgMusicVolume * 0.2
      }
    }
    
    utterance.onend = () => {
      setIsSpeaking(false)
      // RESTORE background music volume when speaking ends!
      if (bgAudioRef.current && bgMusicPlaying) {
        bgAudioRef.current.volume = bgMusicVolume
      }
    }
    
    utterance.onerror = () => {
      setIsSpeaking(false)
      // RESTORE background music volume on error!
      if (bgAudioRef.current && bgMusicPlaying) {
        bgAudioRef.current.volume = bgMusicVolume
      }
    }

    const voices = window.speechSynthesis.getVoices()
    const selectedVoice = voices.find(v => v.name === selectedVoiceName)
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.pitch = voicePitch
    utterance.rate = voiceRate
    utterance.volume = 1

    window.speechSynthesis.speak(utterance)
  }

  // Handle manual toggle in header
  const toggleMute = () => {
    if (!isMuted) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsMuted(true)
      toast.success("Voice guidance muted")
    } else {
      setIsMuted(false)
      toast.success("Voice guidance active!")
      if (recipe) {
        speak(recipe.instructions[currentStep], currentStep)
      }
    }
  }

  // Auto-play step instruction when transition occurs (if not muted)
  useEffect(() => {
    if (recipe && !isMuted) {
      const timer = setTimeout(() => {
        speak(recipe.instructions[currentStep], currentStep)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [currentStep, recipe, isMuted])

  // Stop vocal synthesis & ambient music if component unmounts
  useEffect(() => {
    return () => {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause()
        bgAudioRef.current = null
      }
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-black text-3xl animate-pulse italic">Setting up your station...</div>
  if (!recipe) return <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
    <h2 className="text-2xl font-black mb-4">Recipe missing!</h2>
    <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
  </div>

  const progress = ((currentStep + 1) / recipe.instructions.length) * 100

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col">
      {/* Header / Progress Bar */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-muted">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-2xl">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h1 className="font-black text-lg line-clamp-1">{recipe.title}</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Step {currentStep + 1} of {recipe.instructions.length}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMute}
            className={cn(
              "rounded-2xl transition-all", 
              isMuted ? "text-muted-foreground hover:bg-muted" : "text-primary bg-primary/10 shadow-sm animate-pulse"
            )}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>
        <div className="w-full h-1.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center gap-12">
        {/* Step Content */}
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-3 bg-primary/10 text-primary px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider">
            <Timer className="w-4 h-4" />
            Phase {currentStep + 1}
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black text-foreground leading-[1.1] tracking-tight italic">
            "{recipe.instructions[currentStep]}"
          </h2>

          <div className="grid md:grid-cols-2 gap-8 pt-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-primary/5">
              <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-primary" />
                Chef's Tip
              </h3>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed italic">
                Maintain a steady heat and don't rush the process. Perfection takes patience.
              </p>
            </div>
            <div className="bg-secondary/5 p-8 rounded-[2.5rem] border border-secondary/10">
              <h3 className="font-black text-xl mb-4 text-secondary">Involved Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {[...recipe.ingredients]
                  .sort((a, b) => {
                    const aMissing = isMissing(a.item)
                    const bMissing = isMissing(b.item)
                    if (aMissing && !bMissing) return -1
                    if (!aMissing && bMissing) return 1
                    return 0
                  })
                  .slice(0, 3)
                  .map((ing: any, i: number) => {
                    const missing = isMissing(ing.item)
                  return (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className={cn(
                        "font-black px-4 py-2 rounded-xl text-md transition-all shadow-sm",
                        missing 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : "bg-white border-secondary/20 text-secondary"
                      )}
                    >
                      {missing ? `❌ ${ing.item}` : `✅ ${ing.item}`}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Voice & Atmosphere Dashboard Card */}
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-premium border border-primary/5 space-y-6 animate-in fade-in duration-1000 delay-300">
          <h3 className="font-black text-2xl mb-2 flex items-center gap-2 text-foreground tracking-tight">
            <Sliders className="w-7 h-7 text-primary" />
            Chef Narrator & Atmosphere Suite
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Voice Controls Column */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-muted-foreground flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary/80" />
                Narrator Settings
              </h4>
              
              <div className="space-y-2">
                <label className="text-sm font-black text-secondary tracking-wide uppercase">Select Narrator Voice</label>
                <select 
                  value={selectedVoiceName}
                  onChange={(e) => {
                    setSelectedVoiceName(e.target.value)
                    toast.success("Narrator voice changed!")
                  }}
                  className="w-full p-4 bg-[#FDFCF8] border border-muted rounded-2xl text-md font-bold text-secondary outline-none focus:border-primary transition-all cursor-pointer shadow-sm"
                >
                  {voicesList.length === 0 ? (
                    <option value="">System Default</option>
                  ) : (
                    voicesList.map((voice, idx) => (
                      <option key={idx} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-secondary tracking-wide uppercase">Voice Pitch</label>
                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{voicePitch.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                    className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-secondary tracking-wide uppercase">Voice Speed</label>
                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{voiceRate.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                    className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Background Soundtrack Column */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l border-muted pt-6 md:pt-0 md:pl-8">
              <h4 className="font-bold text-lg text-muted-foreground flex items-center gap-2">
                <Music className="w-5 h-5 text-secondary" />
                Atmosphere Soundtrack
              </h4>

              <div className="space-y-2">
                <label className="text-sm font-black text-secondary tracking-wide uppercase block">Upload Kitchen Soundtrack</label>
                <div className="relative">
                  <input 
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (bgAudioRef.current) {
                          bgAudioRef.current.pause()
                        }
                        const url = URL.createObjectURL(file)
                        const audio = new Audio(url)
                        audio.loop = true
                        audio.volume = bgMusicVolume
                        bgAudioRef.current = audio
                        setBgTrackName(file.name)
                        setBgMusicPlaying(true)
                        audio.play()
                        toast.success(`Atmosphere active: ${file.name}`)
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full p-4 bg-[#FDFCF8] border border-dashed border-muted rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all cursor-pointer shadow-sm">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-md font-bold text-muted-foreground">Choose MP3 Song File</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FDFCF8] p-4 rounded-2xl border border-muted/80 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-secondary uppercase tracking-widest">Active Soundtrack</p>
                  <p className="text-sm font-bold text-muted-foreground truncate italic">{bgTrackName}</p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  type="button"
                  onClick={() => {
                    if (!bgAudioRef.current) {
                      toast.info("Select an MP3 song to play ambient kitchen soundtrack!")
                      return
                    }
                    if (bgMusicPlaying) {
                      bgAudioRef.current.pause()
                      setBgMusicPlaying(false)
                    } else {
                      bgAudioRef.current.play()
                      setBgMusicPlaying(true)
                    }
                  }}
                  className={cn(
                    "rounded-xl transition-all w-12 h-12 flex items-center justify-center",
                    bgMusicPlaying ? "bg-primary text-white border-primary" : "bg-white text-secondary hover:bg-muted"
                  )}
                >
                  {bgMusicPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-secondary tracking-wide uppercase">Music Volume</label>
                  <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{Math.round(bgMusicVolume * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={bgMusicVolume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value)
                    setBgMusicVolume(vol)
                    if (bgAudioRef.current) {
                      bgAudioRef.current.volume = vol
                    }
                  }}
                  className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground font-semibold italic text-center">
                  🔊 Ducking Mode Active: Music volume automatically ducks down by 80% while the chef speaks step instructions!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Controls */}
      <footer className="p-8 md:p-12 bg-white border-t border-muted">
        <div className="max-w-4xl mx-auto flex gap-6">
          <Button 
            variant="outline" 
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="h-20 flex-1 rounded-3xl border-2 border-muted hover:border-primary text-xl font-black transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-8 h-8 mr-2" />
            Previous
          </Button>
          
          {currentStep === recipe.instructions.length - 1 ? (
            <Button 
              onClick={() => {
                setShowCelebration(true)
                if (typeof window !== 'undefined') {
                  window.speechSynthesis.cancel()
                }
              }}
              className="h-20 flex-[2] bg-primary hover:bg-primary/95 text-white rounded-3xl shadow-xl shadow-primary/20 text-xl font-black group flex items-center justify-center gap-2 animate-bounce-once"
            >
              <CheckCircle2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
              Finish Cooking
            </Button>
          ) : (
            <Button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="h-20 flex-[2] bg-primary hover:bg-primary/90 text-white rounded-3xl shadow-xl shadow-primary/20 text-xl font-black group"
            >
              Next Step
              <ChevronRight className="w-8 h-8 ml-2 group-hover:translate-x-2 transition-transform" />
            </Button>
          )}
        </div>
      </footer>

      {/* Chef Celebration & Rating Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg overflow-y-auto animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-white p-8 rounded-[3rem] shadow-2xl border border-muted/50 space-y-6 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 my-8">
            
            {/* Confetti Background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
              <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping duration-1000" />
              <div className="absolute top-20 right-16 w-3 h-3 bg-primary/40 rounded-full animate-ping duration-700" />
              <div className="absolute bottom-20 left-12 w-2 h-2 bg-secondary/40 rounded-full animate-ping duration-1500" />
            </div>

            {/* Header: Trophy & Congrats */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-4 bg-yellow-50 text-yellow-500 rounded-3xl animate-bounce">
                <Trophy className="w-10 h-10 fill-current" />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">Congratulations, Chef!</h2>
              <p className="text-sm font-bold text-muted-foreground">
                You just finished cooking <span className="text-primary font-black">"{recipe?.title}"</span>
              </p>
            </div>

            {/* 5-Star Interactive Rating Block */}
            <div className="bg-muted/30 p-6 rounded-3xl border border-muted text-center space-y-4">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest block">
                {getRatingLabel(hoveredRating || rating)}
              </span>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isActive = starValue <= (hoveredRating || rating)
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(starValue)}
                      className="p-1 transition-all duration-150 active:scale-95 focus:outline-none"
                    >
                      <Star 
                        className={cn(
                          "w-10 h-10 transition-all",
                          isActive 
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-md scale-110" 
                            : "text-muted-foreground/35 hover:scale-105"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Photo Upload & Preview zone */}
            <div className="space-y-3">
              <span className="text-sm font-black text-foreground ml-1 block">Snap & Share Your Masterpiece</span>
              
              {creationImage ? (
                <div className="relative group rounded-3xl overflow-hidden border-2 border-primary/20 aspect-video shadow-md">
                  <img 
                    src={creationImage} 
                    alt="My culinary creation" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer bg-white text-foreground font-black px-4 py-2 rounded-xl text-sm shadow hover:bg-muted active:scale-95 transition-transform flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Retake Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <button 
                    onClick={() => setCreationImage(null)}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-muted hover:border-primary/50 bg-muted/20 hover:bg-primary/5 rounded-3xl cursor-pointer transition-all p-4 group">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="p-3 bg-white text-muted-foreground group-hover:text-primary rounded-2xl shadow-sm transition-colors border border-muted">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">Upload Creation Photo</p>
                      <p className="text-xs font-bold text-muted-foreground mt-1">Tap to capture or drop an image</p>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            {/* Actions Grid */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleShareAchievement}
                variant="outline"
                className="h-14 rounded-2xl border-2 border-primary text-primary font-black flex items-center justify-center gap-2 hover:bg-primary/5"
              >
                <Share2 className="w-5 h-5" />
                Share with Friends
              </Button>
              <Button
                onClick={handleCompleteAll}
                className="h-14 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                Save & Finish
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
