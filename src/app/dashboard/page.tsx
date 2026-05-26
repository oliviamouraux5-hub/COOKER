'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fridgeSchema, type FridgeFormValues } from '@/lib/validations/fridge'
import { generateRecipes, createRecipe, toggleFavorite, getFavorites, getHistory, scanFridgeWithGemini } from '@/lib/actions/recipes'
import { getFridgeItems, addFridgeItem, deleteFridgeItem, toggleRestockItem, getFridgeSnapshot, saveFridgeSnapshot, clearAllFridgeItems, clearColdFridgeCategories, type FridgeItem } from '@/lib/actions/fridge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Camera, ChefHat, ChevronRight, ChevronDown, Heart, History, Loader2, MapPin, Plus, Search, Share2, Sparkles, UtensilsCrossed, Trash2, ShoppingCart, Upload, Calendar, Image as ImageIcon, LogOut, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import NearbyShopsDashboard from '@/components/shopping/NearbyShopsDashboard'
import ChefLoadingAnimation from '@/components/ui/ChefLoadingAnimation'
import mockRecipes from '@/lib/data/mock_recipes.json'
const PANTRY_CATEGORIES = [
  {
    name: 'Oils & Condiments',
    items: ['Olive Oil', 'Soy Sauce', 'Vinegar', 'Butter', 'Mayonnaise', 'Sesame Oil']
  },
  {
    name: 'Seasonings & Spices',
    items: ['Salt & Pepper', 'Garlic Powder', 'Onion Powder', 'Oregano', 'Chili Flakes', 'Cumin', 'Paprika']
  },
  {
    name: 'Grains & Baking',
    items: ['Flour', 'Sugar', 'Rice', 'Pasta', 'Oats', 'Honey']
  },
  {
    name: 'Fresh & Dairy',
    items: ['Bread', 'Milk', 'Eggs', 'Cheese']
  }
]

const QUICK_SUGGESTIONS: Record<string, { name: string; emoji: string }[]> = {
  Produce: [
    { name: 'Tomato', emoji: '🍅' },
    { name: 'Spinach', emoji: '🥬' },
    { name: 'Carrot', emoji: '🥕' },
    { name: 'Avocado', emoji: '🥑' },
    { name: 'Onion', emoji: '🧅' },
    { name: 'Garlic', emoji: '🧄' },
    { name: 'Bell Pepper', emoji: '🫑' },
    { name: 'Broccoli', emoji: '🥦' },
    { name: 'Mushroom', emoji: '🍄' },
    { name: 'Lemon', emoji: '🍋' },
    { name: 'Lime', emoji: '🍋' },
    { name: 'Apple', emoji: '🍎' },
    { name: 'Banana', emoji: '🍌' },
    { name: 'Strawberry', emoji: '🍓' },
    { name: 'Zucchini', emoji: '🥒' },
    { name: 'Cucumber', emoji: '🥒' },
    { name: 'Potato', emoji: '🥔' },
    { name: 'Lettuce', emoji: '🥗' },
  ],
  Proteins: [
    { name: 'Chicken Breast', emoji: '🍗' },
    { name: 'Ground Beef', emoji: '🥩' },
    { name: 'Salmon', emoji: '🐟' },
    { name: 'Eggs', emoji: '🥚' },
    { name: 'Shrimp', emoji: '🦐' },
    { name: 'Tuna', emoji: '🐠' },
    { name: 'Turkey', emoji: '🦃' },
    { name: 'Bacon', emoji: '🥓' },
    { name: 'Tofu', emoji: '⬜' },
    { name: 'Lamb', emoji: '🍖' },
    { name: 'Pork Chops', emoji: '🥩' },
    { name: 'Sardines', emoji: '🐟' },
  ],
  Dairy: [
    { name: 'Milk', emoji: '🥛' },
    { name: 'Butter', emoji: '🧈' },
    { name: 'Cheddar', emoji: '🧀' },
    { name: 'Mozzarella', emoji: '🧀' },
    { name: 'Greek Yogurt', emoji: '🫙' },
    { name: 'Heavy Cream', emoji: '🍶' },
    { name: 'Parmesan', emoji: '🧀' },
    { name: 'Brie', emoji: '🧀' },
    { name: 'Cream Cheese', emoji: '🧀' },
    { name: 'Sour Cream', emoji: '🫙' },
    { name: 'Oat Milk', emoji: '🥛' },
    { name: 'Almond Milk', emoji: '🥛' },
  ],
  Pantry: [
    { name: 'Olive Oil', emoji: '🫒' },
    { name: 'Rice', emoji: '🍚' },
    { name: 'Pasta', emoji: '🍝' },
    { name: 'Flour', emoji: '🌾' },
    { name: 'Sugar', emoji: '🍬' },
    { name: 'Honey', emoji: '🍯' },
    { name: 'Soy Sauce', emoji: '🍶' },
    { name: 'Canned Tomatoes', emoji: '🥫' },
    { name: 'Coconut Milk', emoji: '🥥' },
    { name: 'Chickpeas', emoji: '🫘' },
    { name: 'Lentils', emoji: '🫘' },
    { name: 'Oats', emoji: '🥣' },
    { name: 'Bread', emoji: '🍞' },
    { name: 'Crackers', emoji: '🫙' },
    { name: 'Peanut Butter', emoji: '🥜' },
    { name: 'Jam', emoji: '🍓' },
  ],
}

const STAPLE_EMOJIS: Record<string, string> = {
  'Olive Oil': '🫒',
  'Soy Sauce': '🍶',
  'Vinegar': '🏺',
  'Butter': '🧈',
  'Mayonnaise': '🥣',
  'Sesame Oil': '🍶',
  'Salt & Pepper': '🧂',
  'Garlic Powder': '🧄',
  'Onion Powder': '🧅',
  'Oregano': '🌿',
  'Chili Flakes': '🌶️',
  'Cumin': '🌾',
  'Paprika': '🌶️',
  'Flour': '🌾',
  'Sugar': '🍬',
  'Rice': '🍚',
  'Pasta': '🍝',
  'Oats': '🥣',
  'Honey': '🍯',
  'Bread': '🍞',
  'Milk': '🥛',
  'Eggs': '🥚',
  'Cheese': '🧀'
}

const QUICK_PERISHABLES = [
  { name: 'Chicken', emoji: '🍗' },
  { name: 'Beef', emoji: '🥩' },
  { name: 'Salmon', emoji: '🐟' },
  { name: 'Avocado', emoji: '🥑' },
  { name: 'Tomato', emoji: '🍅' },
  { name: 'Spinach', emoji: '🥬' },
  { name: 'Mushroom', emoji: '🍄' },
  { name: 'Lime', emoji: '🍋' }
]

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
  if (t.includes('steak') || t.includes('beef') || t.includes('ribeye') || t.includes('pork') || t.includes('lamb') || t.includes('meat') || t.includes('ham') || t.includes('bacon') || t.includes('sausage')) {
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
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200";
}

export default function DashboardPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<any[]>([])
  const [favoriteRecipes, setFavoriteRecipes] = useState<any[]>([])
  const [historyRecipes, setHistoryRecipes] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'discover' | 'history' | 'favorites' | 'nearby' | 'my-fridge'>('discover')
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [showCreativeModal, setShowCreativeModal] = useState(false)
  const [showPantryModal, setShowPantryModal] = useState(false)
  const [pantryModalTab, setPantryModalTab] = useState<'filters' | 'pantry'>('filters')
  const [includeFridgeInSearch, setIncludeFridgeInSearch] = useState(true)

  // Personal Fridge Inventory States
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([])
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [fridgeInput, setFridgeInput] = useState('')
  const [fridgeItemQuantity, setFridgeItemQuantity] = useState('')
  const [fridgeItemCategory, setFridgeItemCategory] = useState('Produce') // Produce, Proteins, Dairy, Pantry
  const [isAddingFridgeItem, setIsAddingFridgeItem] = useState(false)
  const [isFetchingFridge, setIsFetchingFridge] = useState(false)

  // Add Item Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [addItemStep, setAddItemStep] = useState<'categories' | 'ingredients'>('categories')
  const [addItemCategory, setAddItemCategory] = useState('')
  const [addItemSearch, setAddItemSearch] = useState('')

  // Weekly Polaroid Snapshot states
  const [fridgeSnapshot, setFridgeSnapshot] = useState<string | null>(null)
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(null)
  const [isUploadingSnapshot, setIsUploadingSnapshot] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)

  // Supabase client and profile info
  const supabase = createClient() as any
  const [userName, setUserName] = useState<string>('')
  const [userAvatar, setUserAvatar] = useState<string>('')

  // Hero centerpiece ingredient input
  const [heroInput, setHeroInput] = useState('')
  const [showSyncedList, setShowSyncedList] = useState(false)

  // Fetch or load permanent fridge items and snapshots on mount
  useEffect(() => {
    async function loadFridge() {
      setIsFetchingFridge(true)
      const isDemo = typeof document !== 'undefined' && document.cookie.includes('cooker_session=demo')
      setIsDemoMode(isDemo)

      if (isDemo) {
        // Load from Local Storage fallback
        try {
          const localProfile = localStorage.getItem('cooker_demo_profile')
          if (localProfile) {
            const parsed = JSON.parse(localProfile)
            setUserName(parsed.full_name || '')
            setUserAvatar(parsed.avatar_url || '🧑‍🍳')
          }

          const localItems = localStorage.getItem('cooker_fridge_inventory_v2')
          if (localItems) {
            setFridgeItems(JSON.parse(localItems))
          } else {
            // Initial premium default structured items!
            const defaults: FridgeItem[] = [
              { id: 'demo-1', name: 'Fresh Salmon', quantity: '2 filets', category: 'Proteins', needs_restock: false },
              { id: 'demo-2', name: 'Ripe Avocados', quantity: '3 pieces', category: 'Produce', needs_restock: false },
              { id: 'demo-3', name: 'Cherry Tomatoes', quantity: '1 pack', category: 'Produce', needs_restock: false },
              { id: 'demo-4', name: 'Almond Milk', quantity: '1 carton', category: 'Dairy', needs_restock: false },
              { id: 'demo-5', name: 'Extra Virgin Olive Oil', quantity: '1 bottle', category: 'Pantry', needs_restock: false },
              { id: 'demo-6', name: 'Fresh Basil', quantity: 'to taste', category: 'Produce', needs_restock: true }
            ]
            localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(defaults))
            setFridgeItems(defaults)
          }

          const localSnapshot = localStorage.getItem('cooker_fridge_snapshot_base64')
          const localSnapshotTime = localStorage.getItem('cooker_fridge_snapshot_time')
          if (localSnapshot) {
            setFridgeSnapshot(localSnapshot)
            setSnapshotUpdatedAt(localSnapshotTime || new Date().toLocaleDateString())
          }
        } catch (e) {
          console.error("Failed loading local demo fridge", e)
        }
      } else {
        // Authenticated Supabase flow
        const { items, migrationNeeded: itemsMigrate } = await getFridgeItems()
        const snapRes = await getFridgeSnapshot()
        const isMigrate = !!(itemsMigrate || snapRes?.migrationNeeded)

        if (isMigrate) {
          console.warn("fridge_items or fridge_snapshots table not found in Supabase. Falling back to local storage.")
          const localItems = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
          setFridgeItems(JSON.parse(localItems))
          const localSnapshot = localStorage.getItem('cooker_fridge_snapshot_base64')
          const localSnapshotTime = localStorage.getItem('cooker_fridge_snapshot_time')
          if (localSnapshot) {
            setFridgeSnapshot(localSnapshot)
            setSnapshotUpdatedAt(localSnapshotTime)
          }
        } else {
          setFridgeItems(items || [])
          if (snapRes?.snapshot) {
            setFridgeSnapshot(snapRes.snapshot.photo_base64)
            setSnapshotUpdatedAt(new Date(snapRes.snapshot.updated_at || '').toLocaleString())
          }
          
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              // Automatically sync locally staged profile to Supabase on first active session!
              const staged = localStorage.getItem('cooker_staged_profile') || localStorage.getItem('cooker_demo_profile')
              if (staged) {
                try {
                  const parsed = JSON.parse(staged)
                  await supabase
                    .from('profiles')
                    .upsert({
                      id: user.id,
                      username: parsed.full_name || user.email?.split('@')[0],
                      full_name: parsed.full_name,
                      avatar_url: parsed.avatar_url,
                      dietary_preferences: {
                        vegan: !!parsed.dietary_preferences?.vegan,
                        gluten_free: !!parsed.dietary_preferences?.gluten_free,
                        vegetarian: !!parsed.dietary_preferences?.vegetarian,
                        keto: !!parsed.dietary_preferences?.keto,
                      },
                      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
                    })
                  localStorage.removeItem('cooker_staged_profile')
                  localStorage.removeItem('cooker_demo_profile')
                } catch (syncErr) {
                  console.error("Auto-syncing staged profile failed:", syncErr)
                }
              }

              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
              
              if (profile) {
                const name = profile.full_name || profile.username || ''
                const avatar = profile.avatar_url || '🧑‍🍳'
                setUserName(name)
                setUserAvatar(avatar)
              }
            }
          } catch (e) {
            console.error("Failed loading user profile on dashboard:", e)
          }
        }
      }
      setIsFetchingFridge(false)
      
      const onboardingDone = localStorage.getItem('cooker_onboarding_completed')
      if (!onboardingDone) {
        setShowOnboarding(true)
        setOnboardingStep(1)
      }
    }

    loadFridge()
  }, [])

  const handleLogout = async () => {
    try {
      document.cookie = 'cooker_session=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
      localStorage.removeItem('cooker_staged_profile')
      await supabase.auth.signOut()
      toast.success("Logged out successfully! See you soon, Chef! 👋")
      window.location.href = '/'
    } catch (err) {
      console.error("Logout caught error:", err)
      window.location.href = '/'
    }
  }

  const handleNextOnboarding = () => {
    const nextStep = onboardingStep + 1
    setOnboardingStep(nextStep)
    if (nextStep === 2) {
      setActiveTab('my-fridge')
    } else if (nextStep === 3) {
      setActiveTab('discover')
    } else if (nextStep === 4) {
      setActiveTab('nearby')
    }
  }

  const handlePrevOnboarding = () => {
    const prevStep = onboardingStep - 1
    setOnboardingStep(prevStep)
    if (prevStep === 1) {
      setActiveTab('discover')
    } else if (prevStep === 2) {
      setActiveTab('my-fridge')
    } else if (prevStep === 3) {
      setActiveTab('discover')
    }
  }

  const handleCompleteOnboarding = () => {
    localStorage.setItem('cooker_onboarding_completed', 'true')
    setShowOnboarding(false)
    toast.success("Tutorial completed! Happy Cooking, Chef! 🧑‍🍳🚀")
  }

  const handleRestartOnboarding = () => {
    localStorage.removeItem('cooker_onboarding_completed')
    setOnboardingStep(1)
    setActiveTab('discover')
    setShowOnboarding(true)
    setIsProfileDropdownOpen(false)
    toast.info("Onboarding tutorial restarted! Let's take a quick look around. 🗺️")
  }

  const handleResetFridge = async () => {
    if (!window.confirm("Are you sure you want to empty your entire fridge cabinet? This will delete all ingredients permanently. 🧹")) {
      return
    }

    try {
      if (isDemoMode) {
        setFridgeItems([])
        localStorage.removeItem('cooker_fridge_inventory_v2')
        toast.success("Fridge inventory cleared! 🧹")
      } else {
        const { success } = await clearAllFridgeItems()
        if (success) {
          setFridgeItems([])
          toast.success("Fridge inventory cleared in Supabase! 🧹")
        } else {
          // Fallback to local
          setFridgeItems([])
          localStorage.removeItem('cooker_fridge_inventory_v2')
          toast.success("Fridge inventory cleared locally! 🧹")
        }
      }
    } catch (err) {
      console.error("Failed to reset fridge:", err)
      toast.error("Failed to empty fridge inventory.")
    }
  }

  const handleAddFridgeItem = async () => {
    const name = fridgeInput.trim()
    if (!name) return

    setIsAddingFridgeItem(true)
    const newItemName = name.charAt(0).toUpperCase() + name.slice(1)
    const qty = fridgeItemQuantity.trim() || 'to taste'
    
    if (isDemoMode) {
      // Local fallback
      const newItem: FridgeItem = {
        id: `demo-${Date.now()}`,
        name: newItemName,
        category: fridgeItemCategory,
        quantity: qty,
        needs_restock: false
      }
      const updated = [newItem, ...fridgeItems]
      setFridgeItems(updated)
      localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
      toast.success(`"${newItemName}" added to your ${fridgeItemCategory} shelf! 🍅`)
    } else {
      try {
        // Supabase persistent add
        const { item, error, migrationNeeded } = await addFridgeItem(newItemName, fridgeItemCategory, qty)
        if (migrationNeeded || error) {
          // Graceful local fallback if table missing
          const newItem: FridgeItem = {
            id: `local-${Date.now()}`,
            name: newItemName,
            category: fridgeItemCategory,
            quantity: qty,
            needs_restock: false
          }
          const updated = [newItem, ...fridgeItems]
          setFridgeItems(updated)
          localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
          toast.success(`"${newItemName}" added to local ${fridgeItemCategory} shelf! 🍅`)
        } else if (item) {
          setFridgeItems(prev => [item, ...prev])
          toast.success(`"${newItemName}" saved to Supabase ${fridgeItemCategory} shelf! 🍅`)
        }
      } catch (err) {
        console.error("Supabase add failed, doing local fallback:", err)
        const newItem: FridgeItem = {
          id: `local-${Date.now()}`,
          name: newItemName,
          category: fridgeItemCategory,
          quantity: qty,
          needs_restock: false
        }
        const updated = [newItem, ...fridgeItems]
        setFridgeItems(updated)
        localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
        toast.success(`"${newItemName}" added to local ${fridgeItemCategory} shelf! 🍅`)
      }
    }
    setFridgeInput('')
    setFridgeItemQuantity('')
    setIsAddingFridgeItem(false)
  }

  const handleDeleteFridgeItem = async (id: string, name: string) => {
    if (isDemoMode || id.startsWith('demo-') || id.startsWith('local-')) {
      const updated = fridgeItems.filter(item => item.id !== id)
      setFridgeItems(updated)
      localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
      toast.info(`"${name}" removed from your Fridge.`)
    } else {
      try {
        const { success, migrationNeeded } = await deleteFridgeItem(id)
        if (migrationNeeded) {
          const updated = fridgeItems.filter(item => item.id !== id)
          setFridgeItems(updated)
          localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
          toast.info(`"${name}" removed from your local Fridge.`)
        } else if (success) {
          setFridgeItems(prev => prev.filter(item => item.id !== id))
          toast.info(`"${name}" deleted from Supabase Fridge.`)
        } else {
          // Fall back gracefully if delete returns unsuccessful
          const updated = fridgeItems.filter(item => item.id !== id)
          setFridgeItems(updated)
          localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
          toast.info(`"${name}" removed from your Fridge.`)
        }
      } catch (err) {
        console.error("Failed to delete fridge item from Supabase, doing local fallback:", err)
        const updated = fridgeItems.filter(item => item.id !== id)
        setFridgeItems(updated)
        localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
        toast.info(`"${name}" removed from your Fridge.`)
      }
    }
  }

  const handleToggleRestock = async (id: string, currentNeedsRestock: boolean, name: string) => {
    const nextNeedsRestock = !currentNeedsRestock
    
    // Optimistic UI update
    setFridgeItems(prev => prev.map(item => item.id === id ? { ...item, needs_restock: nextNeedsRestock } : item))
    
    if (isDemoMode || id.startsWith('demo-') || id.startsWith('local-')) {
      const updated = fridgeItems.map(item => item.id === id ? { ...item, needs_restock: nextNeedsRestock } : item)
      localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
      toast.success(nextNeedsRestock ? `"${name}" added to groceries shopping list! 🛒` : `"${name}" removed from groceries.`)
    } else {
      try {
        const { success } = await toggleRestockItem(id, nextNeedsRestock)
        if (success) {
          toast.success(nextNeedsRestock ? `"${name}" synced to Supabase shopping list! 🛒` : `"${name}" removed from groceries.`)
        } else {
          // Fall back to local storage instead of raw rollback to keep UX buttery smooth
          const updated = fridgeItems.map(item => item.id === id ? { ...item, needs_restock: nextNeedsRestock } : item)
          localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
          toast.success(nextNeedsRestock ? `"${name}" added to local shopping list! 🛒` : `"${name}" removed from groceries.`)
        }
      } catch (err) {
        console.error("Failed to update restocking status in Supabase, doing local fallback:", err)
        const updated = fridgeItems.map(item => item.id === id ? { ...item, needs_restock: nextNeedsRestock } : item)
        localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
        toast.success(nextNeedsRestock ? `"${name}" added to local shopping list! 🛒` : `"${name}" removed from groceries.`)
      }
    }
  }

  const handleUploadWeeklyPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingSnapshot(true)
    toast.info("Uploading fridge photo...")

    try {
      const base64Data = await compressImage(file, 800, 800)
      const base64String = `data:image/jpeg;base64,${base64Data}`
      const formattedTime = new Date().toLocaleString()
      
      setFridgeSnapshot(base64String)
      setSnapshotUpdatedAt(formattedTime)
      
      if (isDemoMode) {
        localStorage.setItem('cooker_fridge_snapshot_base64', base64String)
        localStorage.setItem('cooker_fridge_snapshot_time', formattedTime)
      } else {
        const { success, migrationNeeded } = await saveFridgeSnapshot(base64String)
        if (migrationNeeded) {
          localStorage.setItem('cooker_fridge_snapshot_base64', base64String)
          localStorage.setItem('cooker_fridge_snapshot_time', formattedTime)
        } else if (success) {
          console.log("Snapshot synced to Supabase")
        }
      }

      toast.success("📸 Photo uploaded! Now click 'Scan Ingredients' to detect your items.")
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload fridge photo.")
    } finally {
      setIsUploadingSnapshot(false)
    }
  }

  const handleSyncFridgeToSearch = () => {
    if (fridgeItems.length === 0) {
      toast.warning("Your fridge is empty! Add some ingredients first.")
      return
    }
    const ingredientNames = fridgeItems.map(item => item.name).join(', ')
    setValue('ingredients', ingredientNames)
    toast.success("Synchronized active cooking list with your Fridge! ⚡")
  }

  const toggleFridgeItemInSearch = (name: string) => {
    const current = watch('ingredients') || ''
    let items = current.split(/[\n,]+/).map(i => i.trim()).filter(Boolean)
    const index = items.findIndex(i => i.toLowerCase() === name.toLowerCase())
    if (index > -1) {
      items.splice(index, 1)
      toast.info(`"${name}" removed from search query.`)
    } else {
      items.push(name)
      toast.success(`"${name}" added to search query! ⚡`)
    }
    setValue('ingredients', items.join(', '))
  }
  
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<FridgeFormValues>({
    resolver: zodResolver(fridgeSchema),
    defaultValues: { ingredients: '', diet: 'All', mealType: 'All', difficulty: 'All' }
  })

  const [customStaples, setCustomStaples] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')

  const addCustomStaple = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (!customStaples.includes(trimmed)) {
      const updated = [...customStaples, trimmed]
      setCustomStaples(updated)
      setValue(`pantry.${trimmed}` as any, true)
      toast.success(`"${trimmed}" added to your Staple Locker!`)
    } else {
      toast.info(`"${trimmed}" is already in your Staple Locker.`)
    }
    setCustomInput('')
  }

  const removeCustomStaple = (staple: string) => {
    const updated = customStaples.filter(s => s !== staple)
    setCustomStaples(updated)
    setValue(`pantry.${staple}` as any, false)
    toast.info(`"${staple}" removed from your Locker.`)
  }

  const togglePerishable = (tag: string) => {
    const current = watch('ingredients') || ''
    let items = current.split(/[\n,]+/).map(i => i.trim()).filter(Boolean)
    const index = items.findIndex(i => i.toLowerCase() === tag.toLowerCase())
    if (index > -1) {
      items.splice(index, 1)
    } else {
      items.push(tag)
    }
    setValue('ingredients', items.join(', '))
  }

  // Load saved state from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedIngredients = localStorage.getItem('cooker_ingredients')
      const savedDiet = localStorage.getItem('cooker_diet')
      const savedMealType = localStorage.getItem('cooker_mealType')
      const savedDifficulty = localStorage.getItem('cooker_difficulty')
      const savedIsCreative = localStorage.getItem('cooker_isCreative') === 'true'
      const savedIsStrict = localStorage.getItem('cooker_isStrict') === 'true'
      const savedCreativeType = localStorage.getItem('cooker_creativeType') as any
      const savedActiveTab = localStorage.getItem('cooker_activeTab') as any
      const savedHasSearched = localStorage.getItem('cooker_hasSearched') === 'true'
      const savedRecipes = localStorage.getItem('cooker_recipes')
      const savedPantry = localStorage.getItem('cooker_pantry')
      const savedCustom = localStorage.getItem('cooker_custom_staples')

      if (savedIngredients) setValue('ingredients', savedIngredients)
      if (savedDiet) setValue('diet', savedDiet)
      if (savedMealType) setValue('mealType', savedMealType)
      if (savedDifficulty) setValue('difficulty', savedDifficulty)
      setValue('isCreative', savedIsCreative)
      setValue('isStrict', savedIsStrict)
      if (savedCreativeType) setValue('creativeType', savedCreativeType)
      if (savedActiveTab) setActiveTab(savedActiveTab)
      
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'nearby' || tabParam === 'map') {
        setActiveTab('nearby')
      }

      if (savedHasSearched) setHasSearched(savedHasSearched)
      
      if (savedRecipes) {
        try {
          setRecipes(JSON.parse(savedRecipes))
        } catch (e) {
          console.error("Failed to parse saved recipes", e)
        }
      }

      if (savedPantry) {
        try {
          setValue('pantry', JSON.parse(savedPantry))
        } catch (e) {
          console.error("Failed to parse saved pantry", e)
        }
      }

      if (savedCustom) {
        try {
          setCustomStaples(JSON.parse(savedCustom))
        } catch (e) {
          console.error("Failed to parse custom staples", e)
        }
      }
    } catch (error) {
      console.error("Failed to restore cooker state", error)
    }
  }, [setValue])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('cooker_custom_staples', JSON.stringify(customStaples))
    } catch (e) {
      console.error("Failed to save custom staples", e)
    }
  }, [customStaples])

  // Save form values to localStorage on change
  const watchedIngredients = watch('ingredients')
  const watchedDiet = watch('diet')
  const watchedMealType = watch('mealType')
  const watchedDifficulty = watch('difficulty')
  const watchedIsCreative = watch('isCreative')
  const watchedIsStrict = watch('isStrict')
  const watchedCreativeType = watch('creativeType')
  const watchedPantry = watch('pantry')

  const customIngredientsList = (watchedIngredients || '')
    .split(',')
    .map(word => word.trim())
    .filter(word => word.length > 0)

  const activeIngredientsToDisplay = includeFridgeInSearch
    ? fridgeItems.map(item => ({ id: item.id, name: item.name }))
    : customIngredientsList.map((name, idx) => ({ id: `custom-${idx}`, name }))

  const autocompleteSource = includeFridgeInSearch
    ? Array.from(new Set([
        ...fridgeItems.map(i => i.name),
        ...customIngredientsList
      ]))
    : customIngredientsList

  const sugQuery = heroInput.trim().toLowerCase()
  const heroSuggestions = sugQuery.length > 0
    ? autocompleteSource
        .filter(item => item.toLowerCase().includes(sugQuery) && item.toLowerCase() !== sugQuery)
        .slice(0, 5)
    : []

  // Get active word being typed at the end of the comma-separated list
  const getActiveTypedWord = () => {
    if (!watchedIngredients) return ''
    const parts = watchedIngredients.split(',')
    const lastPart = parts[parts.length - 1]
    return lastPart ? lastPart.trimStart() : ''
  }

  const activeTypedWord = getActiveTypedWord()
  const activeTypedQuery = activeTypedWord.trim().toLowerCase()

  const STAPLE_INGREDIENTS = [
    // Proteins
    'Chicken', 'Beef', 'Pork', 'Salmon', 'Tuna', 'Cod', 'Shrimp', 'Tofu', 'Tempeh', 'Bacon', 'Sausage', 'Turkey', 'Lamb', 'Duck', 'Crab', 'Lobster', 'Egg',
    // Vegetables
    'Green beans', 'Tomato', 'Potato', 'Onion', 'Garlic', 'Ginger', 'Carrot', 'Broccoli', 'Spinach', 'Zucchini', 'Eggplant', 'Bell Pepper', 'Mushroom',
    'Cucumber', 'Lettuce', 'Cabbage', 'Cauliflower', 'Asparagus', 'Brussels sprouts', 'Celery', 'Peas', 'Sweet potato', 'Pumpkin', 'Corn', 'Leek', 'Shallot',
    // Fruits
    'Avocado', 'Lemon', 'Lime', 'Apple', 'Banana', 'Strawberry', 'Blueberry', 'Raspberry', 'Orange', 'Mango', 'Pineapple', 'Peach', 'Cherry', 'Grape',
    // Herbs & Spices
    'Cilantro', 'Basil', 'Thyme', 'Rosemary', 'Oregano', 'Parsley', 'Mint', 'Dill', 'Chives', 'Cinnamon', 'Cumin', 'Paprika', 'Turmeric', 'Chili Flakes',
    // Grains & Pasta
    'Rice', 'Pasta', 'Quinoa', 'Oats', 'Flour', 'Bread', 'Tortilla', 'Noodle', 'Couscous',
    // Dairy & Alternatives
    'Cheese', 'Butter', 'Milk', 'Cream', 'Greek yogurt', 'Cottage cheese', 'Parmesan', 'Mozzarella', 'Cheddar', 'Coconut milk',
    // Pantry Staples
    'Olive Oil', 'Soy Sauce', 'Vinegar', 'Honey', 'Maple Syrup', 'Black Beans', 'Chickpeas', 'Lentils', 'Mustard', 'Ketchup', 'Mayonnaise', 'Sesame Oil'
  ]

  const mainSearchSuggestions = activeTypedQuery.length > 1
    ? STAPLE_INGREDIENTS.filter(item => 
        item.toLowerCase().includes(activeTypedQuery) && 
        item.toLowerCase() !== activeTypedQuery
      ).slice(0, 5)
    : []

  const handleSelectMainSuggestion = (sug: string) => {
    const parts = (watchedIngredients || '').split(',')
    // Replace the last part with the suggestion
    parts[parts.length - 1] = ` ${sug}`
    const newValue = parts.join(', ').trim() + ', '
    setValue('ingredients', newValue)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (watchedIngredients !== undefined) localStorage.setItem('cooker_ingredients', watchedIngredients)
      if (watchedDiet !== undefined) localStorage.setItem('cooker_diet', watchedDiet)
      if (watchedMealType !== undefined) localStorage.setItem('cooker_mealType', watchedMealType)
      if (watchedDifficulty !== undefined) localStorage.setItem('cooker_difficulty', watchedDifficulty)
      localStorage.setItem('cooker_isCreative', String(!!watchedIsCreative))
      localStorage.setItem('cooker_isStrict', String(!!watchedIsStrict))
      if (watchedCreativeType) localStorage.setItem('cooker_creativeType', watchedCreativeType)
      if (watchedPantry) localStorage.setItem('cooker_pantry', JSON.stringify(watchedPantry))
    } catch (e) {
      console.error("Failed to save cooker form state", e)
    }
  }, [watchedIngredients, watchedDiet, watchedMealType, watchedDifficulty, watchedIsCreative, watchedIsStrict, watchedCreativeType, watchedPantry])

  // Save other state values when they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('cooker_activeTab', activeTab)
      localStorage.setItem('cooker_hasSearched', String(hasSearched))
      localStorage.setItem('cooker_recipes', JSON.stringify(recipes))
    } catch (e) {
      console.error("Failed to save cooker dashboard state", e)
    }
  }, [activeTab, hasSearched, recipes])

  useEffect(() => {
    async function loadData() {
      const favs = await getFavorites()
      if (favs.recipes) setFavoriteRecipes(favs.recipes)
      const hist = await getHistory()
      if (hist.recipes) setHistoryRecipes(hist.recipes)
    }
    loadData()
  }, [activeTab, hasSearched])

  function compressImage(file: File, maxW = 1024, maxH = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Maintain aspect ratio
          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width)
              width = maxW
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height)
              height = maxH
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get 2D canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          // Export as JPEG with 0.85 quality to shrink the payload size to ~150KB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          const base64 = dataUrl.split(',')[1]
          resolve(base64)
        }
        img.onerror = (err) => reject(err)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  async function handleFridgeScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      console.warn("No file selected during change event.")
      return
    }
    
    console.log("Fridge scan initiated with file:", file.name, "Size:", file.size, "Type:", file.type)
    toast.info("Image received: initiating vision scanner...")
    
    setIsScanning(true)
    setScanStatus('Compressing photo (faster upload)...')
    
    try {
      // Compress and resize the image down to 1024px maximum width/height
      console.log("Compressing image client-side...")
      const base64Data = await compressImage(file)
      console.log("Compression complete. Base64 length:", base64Data.length)

      setScanStatus('Uploading to Gemini AI...')
      console.log("Calling scanFridgeWithGemini server action...")
      const res = await scanFridgeWithGemini(base64Data, 'image/jpeg')
      console.log("Response received from Gemini server action:", res)

      if (res.success && res.ingredients) {
        setValue('ingredients', res.ingredients)
        toast.success("Fridge successfully scanned!")
        handleSubmit(onSuggest)()
      } else {
        // Safe UX Fallback if the user hasn't added their API Key in .env.local yet:
        if (res.error?.includes("GEMINI_API_KEY is missing")) {
          toast.warning("Gemini API Key not set. Using offline local simulator...")
          
          setScanStatus('Falling back to local AI engine...')
          await new Promise(r => setTimeout(r, 600))
          setScanStatus('Identifying organic objects...')
          await new Promise(r => setTimeout(r, 650))
          
          const detectedIngredients = "Orange juice, Milk, Eggs, Ketchup, Pickles, Butter, Lettuce, Carrots, Cucumber, Bell peppers, Sliced cheese, Yogurt"
          setValue('ingredients', detectedIngredients)
          toast.success("Demo Fridge scanned successfully!")
          handleSubmit(onSuggest)()
        } else {
          console.error("Gemini scanning returned error:", res.error)
          toast.error(res.error || "Failed to parse fridge ingredients.")
        }
      }
    } catch (err: any) {
      console.error("Caught error during fridge scan flow:", err)
      toast.error("Scanning failed: " + (err.message || err))
    } finally {
      setIsScanning(false)
      setScanStatus('')
      // Reset file input value to allow re-uploading the exact same photo
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  useEffect(() => {
    async function checkUser() {
      if (typeof document !== 'undefined' && document.cookie.includes('cooker_session=demo')) {
        return
      }
      const { data: { user } } = await createClient().auth.getUser()
      if (!user) {
        router.push('/login')
      }
    }
    checkUser()
  }, [router])

  async function onSuggest(data: FridgeFormValues) {
    setIsGenerating(true)
    setHasSearched(true)

    // Automatically append fridge cabinet ingredients if enabled
    let combinedIngredients = data.ingredients || ''
    if (includeFridgeInSearch && fridgeItems.length > 0) {
      const fridgeNames = fridgeItems.map(i => i.name).join(', ')
      combinedIngredients = combinedIngredients 
        ? `${combinedIngredients}, ${fridgeNames}` 
        : fridgeNames
    }

    if (!combinedIngredients.trim()) {
      toast.error("Please add at least one ingredient, or turn on Sync Fridge Items with items in your cabinet!")
      setIsGenerating(false)
      setHasSearched(false)
      return
    }

    const res = await generateRecipes({
      ...data,
      ingredients: combinedIngredients,
      selectedHeroes: heroInput ? [heroInput.trim()] : [],
      manualIngredients: data.ingredients
    } as any)
    setRecipes(res.recipes || [])
    setIsGenerating(false)
  }

  const handleScanSnapshotForCabinet = async () => {
    if (!fridgeSnapshot) {
      toast.warning("Please upload a weekly snapshot before scanning!")
      return
    }

    setIsScanning(true)
    setScanStatus('AI is recognizing cabinet items...')
    toast.info("Gemini AI is analyzing your physical fridge snapshot... ❄️")

    try {
      const base64Data = fridgeSnapshot.split(',')[1]
      const res = await scanFridgeWithGemini(base64Data, 'image/jpeg')

      if (res.success && res.ingredients) {
        // Clear only cold Refrigerator cabinet shelves (Produce, Proteins, Dairy),
        // leaving the dry Pantry closet staples completely untouched!
        if (!isDemoMode) {
          const clearRes = await clearColdFridgeCategories()
          if (clearRes.migrationNeeded) {
            const localItems = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
            const parsed = JSON.parse(localItems) as FridgeItem[]
            const pantryOnly = parsed.filter(i => i.category === 'Pantry')
            localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(pantryOnly))
          }
        } else {
          const localItems = localStorage.getItem('cooker_fridge_inventory_v2') || '[]'
          const parsed = JSON.parse(localItems) as FridgeItem[]
          const pantryOnly = parsed.filter(i => i.category === 'Pantry')
          localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(pantryOnly))
        }

        // Parse ingredients list and add them with dynamic categories to our cabinet shelves!
        const itemsList = res.ingredients.split(',').map(s => s.trim()).filter(Boolean)
        
        let addedCount = 0
        // Initialize updatedItems with only the existing Pantry items so they are preserved
        const updatedItems: FridgeItem[] = fridgeItems.filter(i => i.category === 'Pantry')

        for (const rawName of itemsList) {
          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
          
          // Deduplicate
          if (updatedItems.some(i => i.name.toLowerCase() === name.toLowerCase())) {
            continue
          }

          // Smart category guessing
          let guessedCategory = 'Produce'
          const nameLower = name.toLowerCase()
          
          if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('yogurt') || nameLower.includes('butter') || nameLower.includes('cream') || nameLower.includes('juice')) {
            guessedCategory = 'Dairy'
          } else if (nameLower.includes('chicken') || nameLower.includes('beef') || nameLower.includes('salmon') || nameLower.includes('pork') || nameLower.includes('meat') || nameLower.includes('fish') || nameLower.includes('egg') || nameLower.includes('turkey') || nameLower.includes('bacon')) {
            guessedCategory = 'Proteins'
          } else if (
            nameLower.includes('oil') || 
            nameLower.includes('sauce') || 
            nameLower.includes('spice') || 
            (nameLower.includes('pepper') && !nameLower.includes('bell') && !nameLower.includes('jalapeno') && !nameLower.includes('chili') && !nameLower.includes('sweet')) || 
            nameLower.includes('salt') || 
            nameLower.includes('flour') || 
            nameLower.includes('rice') || 
            nameLower.includes('pasta') || 
            nameLower.includes('ketchup') || 
            nameLower.includes('pickles') ||
            nameLower.includes('vinegar') ||
            nameLower.includes('sugar') ||
            nameLower.includes('honey')
          ) {
            guessedCategory = 'Pantry'
          }

          if (isDemoMode) {
            const newItem: FridgeItem = {
              id: `demo-${Date.now()}-${Math.random()}`,
              name,
              category: guessedCategory,
              quantity: 'to taste',
              needs_restock: false
            }
            updatedItems.push(newItem)
            addedCount++
          } else {
            const { item, error, migrationNeeded } = await addFridgeItem(name, guessedCategory, 'to taste')
            if (migrationNeeded || error || !item) {
              const newItem: FridgeItem = {
                id: `local-${Date.now()}-${Math.random()}`,
                name,
                category: guessedCategory,
                quantity: 'to taste',
                needs_restock: false
              }
              updatedItems.push(newItem)
              addedCount++
            } else if (item) {
              updatedItems.push(item)
              addedCount++
            }
          }
        }

        setFridgeItems(updatedItems)
        localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updatedItems))

        toast.success(`Successfully scanned! Added ${addedCount} ingredients to your cabinet shelves! 🥬🍖`)
      } else {
        // Fallback for missing Gemini API Key in demo:
        if (res.error?.includes("GEMINI_API_KEY is missing")) {
          toast.warning("Gemini Key missing. Using AI Simulator to identify cabinet items...")
          
          setScanStatus('Identifying crisp organic textures...')
          await new Promise(r => setTimeout(r, 600))
          setScanStatus('Mapping cold compartments...')
          await new Promise(r => setTimeout(r, 650))

          const demoScanned: FridgeItem[] = [
            { id: `demo-scan-1`, name: 'Fresh Lettuce', category: 'Produce', quantity: '1 head', needs_restock: false },
            { id: `demo-scan-2`, name: 'Gouda Cheese', category: 'Dairy', quantity: '200g', needs_restock: false },
            { id: `demo-scan-3`, name: 'Ribeye Steak', category: 'Proteins', quantity: '2 pieces', needs_restock: false },
            { id: `demo-scan-4`, name: 'Greek Yogurt', category: 'Dairy', quantity: '1 tub', needs_restock: false },
            { id: `demo-scan-5`, name: 'Dijon Mustard', category: 'Pantry', quantity: '1 jar', needs_restock: false },
          ]
          
          const merged = [...fridgeItems]
          let addedCount = 0
          demoScanned.forEach(item => {
            if (!merged.some(i => i.name.toLowerCase() === item.name.toLowerCase())) {
              merged.push(item)
              addedCount++
            }
          })
          
          setFridgeItems(merged)
          localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(merged))
          toast.success(`Cabinet Scanner populated ${addedCount} ingredients! ❄️`)
        } else {
          console.error("Gemini scanning returned error:", res.error)
          toast.error(res.error || "Failed to scan snapshot.")
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Scanning failed: " + (err.message || err))
    } finally {
      setIsScanning(false)
      setScanStatus('')
    }
  }

  // Visual Cabinet row helper component
  const FridgeItemRow = ({ item }: { item: FridgeItem }) => {
    const isNeedRestock = item.needs_restock
    return (
      <div className="group flex items-center justify-between p-3 bg-muted/20 hover:bg-muted-foreground/5 border border-muted-foreground/5 hover:border-primary/10 rounded-xl transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-extrabold text-xs text-foreground leading-tight">{item.name}</span>
            <span className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-wider">{item.quantity || 'to taste'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
          {/* Delete Item Button */}
          <button
            type="button"
            onClick={() => handleDeleteFridgeItem(item.id, item.name)}
            className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
            title="Delete permanently"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 selection:bg-primary/10">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-8 rounded-[3rem] shadow-premium border border-primary/5">
          <Link href="/" className="flex items-center gap-6 group cursor-pointer select-none">
            <div className="p-4 bg-primary rounded-3xl shadow-xl shadow-primary/20 group-hover:rotate-6 transition-all duration-500">
              <ChefHat className="text-white w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight italic group-hover:text-primary transition-colors duration-300">COOKER</h1>
              {userName && (
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mt-0.5 ml-0.5 animate-in fade-in duration-300">
                  Chef {userName}
                </p>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-4 flex-col md:flex-row">
            <nav className="flex items-center bg-muted/80 p-2 rounded-[2.5rem] border border-primary/10 shadow-premium">
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('discover')}
                className={cn(
                  "rounded-[2rem] px-8 py-8 text-lg font-black transition-all duration-300 flex items-center gap-3 relative",
                  activeTab === 'discover' 
                    ? "bg-white text-primary shadow-xl scale-105 border border-primary/5" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 scale-95"
                )}
              >
                {showOnboarding && (onboardingStep === 1 || onboardingStep === 3) && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                  </span>
                )}
                <Sparkles className={cn("w-6 h-6", activeTab === 'discover' ? "text-primary" : "text-muted-foreground")} />
                Discover
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('history')}
                className={cn(
                  "rounded-[2rem] px-8 py-8 text-lg font-black transition-all duration-300 flex items-center gap-3 relative",
                  activeTab === 'history' 
                    ? "bg-white text-blue-600 shadow-xl scale-105 border border-blue-500/5" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 scale-95"
                )}
              >
                <History className={cn("w-6 h-6", activeTab === 'history' ? "text-blue-600" : "text-muted-foreground")} />
                History
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('favorites')}
                className={cn(
                  "rounded-[2rem] px-8 py-8 text-lg font-black transition-all duration-300 flex items-center gap-3 relative",
                  activeTab === 'favorites' 
                    ? "bg-white text-secondary shadow-xl scale-105 border border-secondary/5" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 scale-95"
                )}
              >
                <Heart className={cn("w-6 h-6", activeTab === 'favorites' ? "text-secondary fill-current" : "text-muted-foreground")} />
                Favorites
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('nearby')}
                className={cn(
                  "rounded-[2rem] px-8 py-8 text-lg font-black transition-all duration-300 flex items-center gap-3 relative",
                  activeTab === 'nearby' 
                    ? "bg-white text-emerald-600 shadow-xl scale-105 border border-emerald-500/5" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 scale-95"
                )}
              >
                {showOnboarding && onboardingStep === 4 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                )}
                <MapPin className={cn("w-6 h-6", activeTab === 'nearby' ? "text-emerald-600" : "text-muted-foreground")} />
                Nearby
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('my-fridge')}
                className={cn(
                  "rounded-[2rem] px-8 py-8 text-lg font-black transition-all duration-300 flex items-center gap-3 relative",
                  activeTab === 'my-fridge' 
                    ? "bg-white text-orange-500 shadow-xl scale-105 border border-orange-500/5" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 scale-95"
                )}
              >
                {showOnboarding && onboardingStep === 2 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                  </span>
                )}
                <svg className={cn("w-6 h-6 stroke-[2.5]", activeTab === 'my-fridge' ? "text-orange-500" : "text-muted-foreground")} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="6" y="2" width="12" height="20" rx="2.5" />
                  <line x1="6" y1="9" x2="18" y2="9" />
                  <line x1="9" y1="5" x2="9" y2="7" />
                  <line x1="9" y1="12" x2="9" y2="16" />
                </svg>
                My Fridge
              </Button>
            </nav>
            
             <div className="relative">
              <button 
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="rounded-full p-0 bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300 shadow-premium cursor-pointer border-2 border-primary/20 hover:scale-105 flex items-center justify-center w-16 h-16 overflow-hidden"
                title="User settings and logout"
              >
                {userAvatar ? (
                  userAvatar.startsWith('data:image') || userAvatar.startsWith('http') ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl select-none">{userAvatar}</span>
                  )
                ) : (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </button>

              {isProfileDropdownOpen && (
                <>
                  {/* Overlay click-away trigger */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  
                  {/* Floating settings card */}
                  <div className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-2xl border border-primary/10 p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-4 border-b border-muted pb-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl border border-primary/20 overflow-hidden">
                        {userAvatar && (userAvatar.startsWith('data:image') || userAvatar.startsWith('http')) ? (
                          <img src={userAvatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span>{userAvatar || '🧑‍🍳'}</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-foreground truncate">
                          Chef {userName || 'Cooker'}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Active Session
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Link
                        href="/profile/setup"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-primary/5 text-foreground hover:text-primary transition-all font-black text-sm text-left group cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Edit Profile
                      </Link>

                      <button
                        type="button"
                        onClick={handleRestartOnboarding}
                        className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-primary/5 text-foreground hover:text-primary transition-all font-black text-sm text-left group cursor-pointer border-none bg-transparent"
                      >
                        <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        Restart Tutorial
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false)
                          handleLogout()
                        }}
                        className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-red-50 text-red-500 transition-all font-black text-sm text-left group cursor-pointer border-none bg-transparent"
                      >
                        <LogOut className="w-5 h-5 text-red-500" />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
             </div>
          </div>
        </header>

          {/* Results Section */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {activeTab === 'my-fridge' ? (
              <div className="lg:col-span-12 grid md:grid-cols-12 gap-8 animate-in fade-in duration-500">
                {/* Left Side: Polaroid Weekly Snapshot Photo */}
                <div className="md:col-span-4 space-y-6">
                  <Card className="border-none shadow-premium bg-white p-6 rounded-[2.5rem] overflow-hidden flex flex-col justify-between h-full min-h-[450px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-xl text-foreground flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-orange-500" />
                          Weekly Snapshot
                        </h3>
                        <Badge className="bg-orange-500/10 text-orange-600 border-none font-extrabold uppercase text-[9px] tracking-wider">
                          REAL LOOK
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        Take a picture of your physical fridge at the start of every week to look inside from anywhere!
                      </p>
                    </div>

                    {/* Polaroid Photo Frame */}
                    <div className="my-6 relative border-8 border-[#faf9f6] bg-[#faf9f6] shadow-md rounded-2xl aspect-[4/5] flex flex-col items-center justify-center overflow-hidden group">
                      {fridgeSnapshot ? (
                        <>
                          <img
                            src={fridgeSnapshot}
                            alt="Inside my fridge"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {/* Scanning overlay */}
                          {isScanning && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center animate-in fade-in duration-300 z-10 overflow-hidden">
                              <div className="absolute w-32 h-32 rounded-full border border-primary/25 animate-ping duration-1000" />
                              <div className="absolute w-24 h-24 rounded-full border-2 border-primary/30 animate-pulse" />
                              <Loader2 className="w-10 h-10 text-white animate-spin mb-3 relative z-10" />
                              <p className="text-white font-black animate-pulse relative z-10 uppercase tracking-widest text-[9px]">{scanStatus}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                            <Camera className="w-8 h-8 text-orange-400" />
                          </div>
                          <p className="text-xs font-bold mb-3">No snapshot yet</p>
                          <label className="text-xs font-black text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" />
                            Snap My Fridge
                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadWeeklyPhoto} />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Action buttons — always visible below photo */}
                    {fridgeSnapshot && (
                      <div className="flex gap-2 mt-3">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-muted/60 hover:bg-muted text-foreground font-black text-xs px-3 py-2.5 rounded-2xl cursor-pointer transition-all">
                          <Camera className="w-3.5 h-3.5 text-orange-500" />
                          Update Photo
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadWeeklyPhoto} />
                        </label>
                        <Button
                          type="button"
                          onClick={handleScanSnapshotForCabinet}
                          disabled={isScanning || isUploadingSnapshot}
                          className="flex-1 bg-primary hover:bg-primary/90 text-white font-black text-xs px-3 py-2.5 rounded-2xl h-auto flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
                        >
                          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          {isScanning ? 'Scanning...' : 'Scan Ingredients'}
                        </Button>
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="pt-4 border-t border-muted/50 flex items-center justify-between text-xs font-bold text-muted-foreground/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        <span>Last snap:</span>
                      </div>
                      <span className="text-foreground">{snapshotUpdatedAt || 'Never'}</span>
                    </div>
                  </Card>
                </div>

                {/* Center: 3D Visual Fridge & Pantry Cabinet */}
                <div className="md:col-span-8 space-y-6">
                  {/* Stock Cabinet Shelves Header Bar */}
                  <Card className="border-none shadow-premium bg-white px-6 py-5 rounded-[2.5rem]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-xl text-foreground flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="6" y="2" width="12" height="20" rx="2.5" />
                          <line x1="6" y1="9" x2="18" y2="9" />
                        </svg>
                        Stock Cabinet Shelves
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetFridge}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all border border-red-200 hover:border-red-500 active:scale-95 cursor-pointer"
                          title="Reset entire fridge cabinet"
                        >
                          <Trash2 className="w-4 h-4" />
                          Reset Fridge
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddItemStep('categories')
                            setAddItemSearch('')
                            setAddItemCategory('')
                            setShowAddItemModal(true)
                          }}
                          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[3px]" />
                          Add Item
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* Gorgeous Cabinet Refrigerator Shelves Grid */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* LEFT SIDE: Cold Refrigerator Doors */}
                    <div className="space-y-6 bg-blue-50/20 p-4 rounded-[2.5rem] border border-blue-100/40">
                      <div className="flex items-center justify-between px-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Refrigerator Doors</span>
                        <span className="text-[9px] font-extrabold text-blue-500">COLD CABINET ❄️</span>
                      </div>

                      {/* Produce Crisper */}
                      <Card className="border-none shadow-sm bg-white/70 backdrop-blur-md p-5 rounded-[2rem] space-y-3">
                        <div className="flex items-center justify-between border-b border-muted/50 pb-2">
                          <span className="font-black text-sm text-foreground flex items-center gap-1.5">
                            <span>🥬</span> Fresh Produce Crisper
                          </span>
                          <Badge className="bg-emerald-50 text-emerald-700 border-none font-extrabold text-[9px]">
                            {fridgeItems.filter(i => i.category === 'Produce').length} Items
                          </Badge>
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-premium pr-1">
                          {fridgeItems.filter(i => i.category === 'Produce').length > 0 ? (
                            fridgeItems.filter(i => i.category === 'Produce').map(item => (
                              <FridgeItemRow key={item.id} item={item} />
                            ))
                          ) : (
                            <span className="block text-center py-4 text-[10px] text-muted-foreground/60 font-semibold italic">Produce Crisper is empty</span>
                          )}
                        </div>
                      </Card>

                      {/* Proteins Drawer */}
                      <Card className="border-none shadow-sm bg-white/70 backdrop-blur-md p-5 rounded-[2rem] space-y-3">
                        <div className="flex items-center justify-between border-b border-muted/50 pb-2">
                          <span className="font-black text-sm text-foreground flex items-center gap-1.5">
                            <span>🍖</span> Proteins & Meats Drawer
                          </span>
                          <Badge className="bg-red-50 text-red-700 border-none font-extrabold text-[9px]">
                            {fridgeItems.filter(i => i.category === 'Proteins').length} Items
                          </Badge>
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-premium pr-1">
                          {fridgeItems.filter(i => i.category === 'Proteins').length > 0 ? (
                            fridgeItems.filter(i => i.category === 'Proteins').map(item => (
                              <FridgeItemRow key={item.id} item={item} />
                            ))
                          ) : (
                            <span className="block text-center py-4 text-[10px] text-muted-foreground/60 font-semibold italic">Meats Drawer is empty</span>
                          )}
                        </div>
                      </Card>

                      {/* Dairy & Drinks */}
                      <Card className="border-none shadow-sm bg-white/70 backdrop-blur-md p-5 rounded-[2rem] space-y-3">
                        <div className="flex items-center justify-between border-b border-muted/50 pb-2">
                          <span className="font-black text-sm text-foreground flex items-center gap-1.5">
                            <span>🥛</span> Dairy & Drinks Shelf
                          </span>
                          <Badge className="bg-cyan-50 text-cyan-700 border-none font-extrabold text-[9px]">
                            {fridgeItems.filter(i => i.category === 'Dairy').length} Items
                          </Badge>
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-premium pr-1">
                          {fridgeItems.filter(i => i.category === 'Dairy').length > 0 ? (
                            fridgeItems.filter(i => i.category === 'Dairy').map(item => (
                              <FridgeItemRow key={item.id} item={item} />
                            ))
                          ) : (
                            <span className="block text-center py-4 text-[10px] text-muted-foreground/60 font-semibold italic">Dairy Shelf is empty</span>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* RIGHT SIDE: Warm Pantry Shelves */}
                    <div className="space-y-6 bg-amber-50/20 p-4 rounded-[2.5rem] border border-amber-100/40">
                      <div className="flex items-center justify-between px-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Dry Pantry Closet</span>
                        <span className="text-[9px] font-extrabold text-amber-600">STAPLE LOCKER 🥫</span>
                      </div>

                      <Card className="border-none shadow-sm bg-white/70 backdrop-blur-md p-5 rounded-[2rem] space-y-3 h-[calc(100%-2rem)] flex flex-col justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center justify-between border-b border-muted/50 pb-2">
                            <span className="font-black text-sm text-foreground flex items-center gap-1.5">
                              <span>🌾</span> Staple Pantry Goods
                            </span>
                            <Badge className="bg-amber-50 text-amber-700 border-none font-extrabold text-[9px]">
                              {fridgeItems.filter(i => i.category === 'Pantry').length} Items
                            </Badge>
                          </div>
                          <div className="space-y-2 max-h-[460px] overflow-y-auto scrollbar-premium pr-1 flex-1">
                            {fridgeItems.filter(i => i.category === 'Pantry').length > 0 ? (
                              fridgeItems.filter(i => i.category === 'Pantry').map(item => (
                                <FridgeItemRow key={item.id} item={item} />
                              ))
                            ) : (
                              <span className="block text-center py-12 text-[10px] text-muted-foreground/60 font-semibold italic">Dry Pantry Shelves are empty</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>


              </div>
            ) : activeTab === 'nearby' ? (
              <div className="lg:col-span-12">
                <NearbyShopsDashboard />
              </div>
            ) : activeTab === 'discover' ? (
              <>
                {/* Left Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  {/* AI Chef Assistant Form Panel */}
                  <Card className="border-none shadow-premium bg-white p-6 rounded-[2.5rem] border border-primary/5 space-y-6">
                    <div>
                      <h3 className="font-black text-xl text-foreground flex items-center gap-2">
                        <ChefHat className="w-6 h-6 text-primary" />
                        Chef Assistant
                      </h3>
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider mt-0.5">Customize your culinary request</p>
                    </div>

                    <div className="space-y-4">
                      {/* Ingredients Input Panel */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Ingredients</label>
                        <div className="relative">
                          <textarea
                            placeholder="Search or add custom ingredients... (e.g. Tomatoes, Salmon)"
                            {...register('ingredients')}
                            rows={3}
                            className="w-full bg-muted/40 border border-muted-foreground/10 rounded-2xl pl-5 pr-12 py-3 text-xs font-semibold outline-none focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/5 transition-all text-foreground resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmit(onSuggest)()
                              }
                            }}
                          />
                          
                          {mainSearchSuggestions.length > 0 && (
                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-orange-100 rounded-2xl shadow-xl py-1.5 max-h-[160px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                              {mainSearchSuggestions.map((sug, idx) => (
                                <button
                                  key={`main-sug-${idx}`}
                                  type="button"
                                  onClick={() => handleSelectMainSuggestion(sug)}
                                  className="w-full text-left px-4 py-2 text-[11px] font-bold text-orange-950 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                >
                                  <span>{sug}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => document.getElementById('discover-fridge-upload')?.click()}
                            className="absolute right-3 bottom-3 p-2.5 rounded-xl text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center cursor-pointer"
                            title="Quick Scan Fridge Picture"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                          <input
                            id="discover-fridge-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFridgeScan}
                          />

                          {isScanning && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center animate-in fade-in duration-300 z-10 px-4">
                              <Loader2 className="w-4 h-4 text-primary animate-spin mr-2" />
                              <span className="text-[11px] font-black text-primary uppercase tracking-widest animate-pulse">{scanStatus || 'Analyzing Photo...'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sync Fridge Items Toggle */}
                      <div className="flex flex-col p-3 bg-orange-50/40 border border-orange-100 rounded-2xl gap-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="block font-black text-[10px] text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-orange-500" />
                              Sync Fridge Items
                            </span>
                            <span className="block text-[9px] text-orange-600/80 font-bold">Chef automatically reads cabinet drawer</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeFridgeInSearch}
                              onChange={(e) => setIncludeFridgeInSearch(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                        </div>

                        {includeFridgeInSearch && fridgeItems.length > 0 && (
                          <div className="pt-2 border-t border-orange-200/50 space-y-2">
                            <button
                              type="button"
                              onClick={() => setShowSyncedList(!showSyncedList)}
                              className="w-full text-[8px] font-black uppercase tracking-wider text-orange-700 hover:text-orange-850 transition-colors flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-100/40 rounded-xl border border-orange-200/20 active:scale-95 duration-200"
                            >
                              {showSyncedList ? "Hide Synced Fridge Items" : `Show Synced Fridge Items (${fridgeItems.length})`}
                            </button>
                            
                            {showSyncedList && (
                              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1 pt-1 animate-in slide-in-from-top-1 duration-200">
                                {fridgeItems.map(item => (
                                  <span key={`show-sync-${item.id}`} className="px-2.5 py-1 bg-orange-100 text-orange-900 border border-orange-200/30 rounded-xl text-[9px] font-bold">
                                    {item.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                        
                      {/* Star centerpiece hero input */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1">
                          Star centerpiece ingredient (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={heroInput}
                            onChange={(e) => setHeroInput(e.target.value)}
                            placeholder="e.g. Chicken breast, Beef, Salmon..."
                            className="w-full bg-muted/40 border border-muted-foreground/10 rounded-2xl px-5 py-3 text-xs font-semibold outline-none focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/5 transition-all text-foreground"
                          />
                          
                          {heroSuggestions.length > 0 && (
                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-orange-100 rounded-2xl shadow-xl py-1.5 max-h-[160px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                              {heroSuggestions.map((sug, idx) => (
                                <button
                                  key={`sug-${idx}`}
                                  type="button"
                                  onClick={() => setHeroInput(sug)}
                                  className="w-full text-left px-4 py-2 text-[11px] font-bold text-orange-950 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                >
                                  <span>{sug}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[8px] font-bold text-muted-foreground/60 leading-normal ml-1">
                          The Chef will design a premium dish specifically highlighting this item.
                        </p>
                      </div>

                      {/* Dropdowns Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Prep Time</label>
                          <div className="relative">
                            <select 
                              {...register('prepTime')}
                              className="w-full appearance-none bg-muted/40 border border-muted-foreground/10 rounded-2xl p-3 text-[11px] font-black text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="">Any Time</option>
                              <option value="10">Under 10m</option>
                              <option value="20">Under 20m</option>
                              <option value="30">Under 30m</option>
                              <option value="60">Under 1h</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Difficulty</label>
                          <div className="relative">
                            <select 
                              {...register('difficulty')}
                              className="w-full appearance-none bg-muted/40 border border-muted-foreground/10 rounded-2xl p-3 text-[11px] font-black text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="All">All Levels</option>
                              <option value="Beginner">Beginner</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Advanced">Advanced</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Occasion</label>
                          <div className="relative">
                            <select 
                              {...register('mealType')}
                              className="w-full appearance-none bg-muted/40 border border-muted-foreground/10 rounded-2xl p-3 text-[11px] font-black text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="All">Any Meal</option>
                              <option value="Breakfast">Breakfast</option>
                              <option value="Lunch">Lunch</option>
                              <option value="Dinner">Dinner</option>
                              <option value="Snack">Snack</option>
                              <option value="Dessert">Dessert</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Dietary Target</label>
                          <div className="relative">
                            <select 
                              {...register('diet')}
                              className="w-full appearance-none bg-muted/40 border border-muted-foreground/10 rounded-2xl p-3 text-[11px] font-black text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="All">No Diet</option>
                              <option value="Vegetarian">Vegetarian</option>
                              <option value="Vegan">Vegan</option>
                              <option value="Gluten-Free">Gluten-Free</option>
                              <option value="Dairy-Free">Dairy-Free</option>
                              <option value="High Protein">High Protein</option>
                              <option value="Low Carb">Low Carb</option>
                              <option value="Keto">Keto</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <Button
                          type="button"
                          onClick={() => {
                            setValue('isCreative', false)
                            handleSubmit(onSuggest, (errors) => {
                              console.error("Form Validation Errors:", errors)
                              toast.error("Validation failed: " + Object.keys(errors).join(', '))
                            })()
                          }}
                          disabled={isGenerating}
                          className="flex-1 bg-white hover:bg-muted text-foreground border border-muted-foreground/10 rounded-2xl py-3.5 h-auto text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          {isGenerating && !watch('isCreative') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          Search Library
                        </Button>

                        <Button
                          type="button"
                          onClick={() => setShowCreativeModal(true)}
                          disabled={isGenerating}
                          className="flex-1 bg-primary hover:bg-primary/95 text-white rounded-2xl py-3.5 h-auto text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/10 transition-all"
                        >
                          {isGenerating && watch('isCreative') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Ask AI Chef
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* End of Left Sidebar */}
                </div>
                {/* Right Recipe Feed */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-foreground flex items-center gap-4 uppercase tracking-tighter">
                      {recipes.length > 0 ? 'Explore Recipes' : 'Freshly Published Creations'}
                      <span className="w-12 h-1.5 bg-primary rounded-full hidden md:block" />
                    </h2>
                    {recipes.length > 0 ? (
                      <Badge variant="outline" className="border-primary text-primary px-4 py-1 rounded-full font-bold">Generated by AI</Badge>
                    ) : (
                      <Badge variant="outline" className="border-secondary text-secondary px-4 py-1 rounded-full font-bold">Chef's Featured</Badge>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-8">
                    {isGenerating ? (
                      <div className="col-span-full py-12">
                        <ChefLoadingAnimation />
                      </div>
                    ) : hasSearched && recipes.length === 0 ? (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-[2.5rem] border border-dashed border-muted-foreground/20">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                          <ChefHat className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-black text-xl text-foreground">No Exact Matches Found</h3>
                          <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            We couldn't find a classic library recipe for those specific ingredients. Click <strong className="text-primary">Ask AI Chef</strong> instead to have our Chef generate a custom recipe from scratch!
                          </p>
                        </div>
                      </div>
                    ) : (
                      (recipes.length > 0 ? recipes : mockRecipes).map((recipe, i) => (
                        <Card 
                          key={recipe.id || i} 
                          className="border-none shadow-premium bg-white overflow-hidden rounded-[2.5rem] group hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col"
                          onClick={async () => {
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('cooker_active_recipe', JSON.stringify(recipe))
                            }
                            const result = await createRecipe(recipe);
                            if (result.success && result.recipe) {
                              router.push(`/recipes/${result.recipe.id}`);
                            } else {
                              router.push(`/recipes/demo-active`);
                            }
                          }}
                        >
                          <div className="h-56 relative overflow-hidden">
                            <img 
                              src={recipe.image_url || getRealisticFoodFallback(recipe.title)} 
                              alt={recipe.title} 
                              onError={(e) => {
                                e.currentTarget.src = getRealisticFoodFallback(recipe.title);
                              }}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute top-4 left-4 flex items-center gap-2">
                              <Badge className="bg-white/90 backdrop-blur-md text-foreground border-none font-bold shadow-sm">
                                {recipe.prep_time || 25} mins
                              </Badge>
                              {recipe.is_ai_generated && (
                                <Badge className="bg-secondary text-white border-none font-bold shadow-sm">AI CREATION</Badge>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="rounded-xl bg-white/90 backdrop-blur-md shadow-lg hover:bg-white text-foreground"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!recipe.id) {
                                    toast.error("Please start cooking this recipe to favorite it permanently");
                                    return;
                                  }
                                  const res = await toggleFavorite(recipe.id, !recipe.is_public);
                                  if (res.success) {
                                    toast.success(!recipe.is_public ? "Added to favorites!" : "Removed from favorites");
                                    const favs = await getFavorites();
                                    if (favs.recipes) setFavoriteRecipes(favs.recipes);
                                  } else {
                                    toast.error("Login to save favorites");
                                  }
                                }}
                              >
                                <Heart className="w-5 h-5 text-foreground" />
                              </Button>
                              {!recipe.is_ai_generated && (
                                <Button 
                                  size="icon" 
                                  variant="secondary" 
                                  className="rounded-xl bg-secondary text-white shadow-lg hover:bg-secondary/90 border-none"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setIsGenerating(true);
                                    const res = await generateRecipes({
                                      ingredients: `${watch('ingredients')}, ${recipe.title}`,
                                      isCreative: true,
                                      creativeType: 'strict',
                                      pantry: watch('pantry')
                                    });
                                    setRecipes(res.recipes || []);
                                    setIsGenerating(false);
                                    toast.success("Recipe adapted for your fridge!");
                                  }}
                                >
                                  <Sparkles className="w-5 h-5" />
                                </Button>
                              )}
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="rounded-xl bg-white/90 backdrop-blur-md shadow-lg hover:bg-white text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                <Share2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-8 space-y-4 flex-1 flex flex-col">
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-wider">
                                {recipe.difficulty || 'Intermediate'}
                              </Badge>
                              {recipe.diet && recipe.diet !== 'None' && (
                                <Badge variant="secondary" className="bg-secondary/10 text-secondary border-none text-[10px] font-black uppercase tracking-wider">
                                  {recipe.diet}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">{recipe.title}</CardTitle>
                              {recipe.matchPercentage !== undefined && (
                                <div className="flex flex-col gap-2 w-full mt-1">
                                  <div className="flex items-center justify-between text-[11px] font-extrabold tracking-tight">
                                    <span className={cn(
                                      "flex items-center gap-1.5",
                                      recipe.matchPercentage >= 80 ? "text-emerald-600" :
                                      recipe.matchPercentage >= 50 ? "text-amber-600" : "text-muted-foreground"
                                    )}>
                                      <span className={cn("w-2 h-2 rounded-full inline-block animate-pulse", 
                                        recipe.matchPercentage >= 80 ? "bg-emerald-500" :
                                        recipe.matchPercentage >= 50 ? "bg-amber-500" : "bg-muted-foreground/50"
                                      )} />
                                      {recipe.matchPercentage}% Kitchen Match
                                    </span>
                                    {recipe.totalCount && (
                                      <span className="text-muted-foreground/60 text-[10px] font-black">
                                        {recipe.matchedCount || 0} of {recipe.totalCount} items
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden border border-muted/20">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        recipe.matchPercentage >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                                        recipe.matchPercentage >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-gray-300 to-gray-400"
                                      )}
                                      style={{ width: `${recipe.matchPercentage}%` }}
                                    />
                                  </div>
                                  {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                                    <span className="text-[10px] font-bold text-muted-foreground/50 italic mt-0.5">
                                      Need to buy: {recipe.missingIngredients.join(', ')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 font-medium flex-1">
                              {recipe.instructions?.[0] || 'Professional cooking guide...'}
                            </p>
                            <div className="pt-4 border-t border-muted/50 flex items-center justify-between">
                              <span className="text-secondary font-black flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                Cook Now <ArrowRight className="w-5 h-5" />
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  {!hasSearched && (
                    <div className="col-span-full mt-12 p-8 bg-gradient-to-br from-primary/10 via-white to-secondary/10 rounded-[3rem] border border-primary/10 shadow-premium flex flex-col md:flex-row items-center justify-between gap-6 text-left animate-in fade-in slide-in-from-bottom duration-500">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-primary/15 rounded-3xl flex items-center justify-center flex-shrink-0 animate-bounce-subtle">
                          <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-foreground">Want Customized Fridge Recipes?</h3>
                          <p className="text-muted-foreground font-medium text-md mt-1">
                            Upload a photo of your fridge or list your ingredients on the left to activate your personal AI Chef!
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          toast.info("Use the inventory panel on the left to get customized suggestions!");
                        }}
                        className="bg-primary hover:bg-primary/95 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-primary/20 flex-shrink-0"
                      >
                        Start My Kitchen Scan <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="lg:col-span-12 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-foreground flex items-center gap-4 uppercase tracking-tighter">
                    {activeTab === 'history' ? 'Cooked History' : 'My Favorites'}
                    <span className="w-12 h-1.5 bg-primary rounded-full hidden md:block" />
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-8">
                  {(activeTab === 'history' ? historyRecipes : favoriteRecipes).map((recipe, i) => (
                    <Card 
                      key={recipe.id || i} 
                      className="border-none shadow-premium bg-white overflow-hidden rounded-[2.5rem] group hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col"
                      onClick={async () => {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('cooker_active_recipe', JSON.stringify(recipe))
                        }
                        const result = await createRecipe(recipe);
                        if (result.success && result.recipe) {
                          router.push(`/recipes/${result.recipe.id}`);
                        } else {
                          router.push(`/recipes/demo-active`);
                        }
                      }}
                    >
                      <div className="h-56 relative overflow-hidden">
                          <img 
                            src={recipe.image_url || getRealisticFoodFallback(recipe.title)} 
                            alt={recipe.title} 
                            onError={(e) => {
                              e.currentTarget.src = getRealisticFoodFallback(recipe.title);
                            }}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <Badge className="bg-white/90 backdrop-blur-md text-foreground border-none font-bold shadow-sm">
                            {recipe.prep_time || 25} mins
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-8 space-y-4 flex-1 flex flex-col">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-wider">
                            {recipe.difficulty || 'Intermediate'}
                          </Badge>
                          {recipe.diet && recipe.diet !== 'None' && (
                            <Badge variant="secondary" className="bg-secondary/10 text-secondary border-none text-[10px] font-black uppercase tracking-wider">
                              {recipe.diet}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">{recipe.title}</CardTitle>
                        <p className="text-muted-foreground line-clamp-2 font-medium flex-1">
                          {recipe.instructions?.[0] || 'Professional cooking guide...'}
                        </p>
                        <div className="pt-4 border-t border-muted/50 flex items-center justify-between">
                          <span className="text-secondary font-black flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                            Revisit Recipe <ArrowRight className="w-5 h-5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {activeTab === 'history' && historyRecipes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center bg-white/40 rounded-[3.5rem] border-4 border-dashed border-blue-500/20 shadow-inner">
                    <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                      <History className="w-12 h-12 text-blue-500 animate-spin-slow" />
                    </div>
                    <h3 className="text-3xl font-black text-foreground mb-4">No History Yet</h3>
                    <p className="text-muted-foreground max-w-md font-medium text-lg">
                      Start cooking recipes from the discovery feed to build your history here.
                    </p>
                  </div>
                )}

                {activeTab === 'favorites' && favoriteRecipes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center bg-white/40 rounded-[3.5rem] border-4 border-dashed border-secondary/20 shadow-inner">
                    <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
                      <Heart className="w-12 h-12 text-secondary animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-foreground mb-4">Your Gallery is Empty</h3>
                    <p className="text-muted-foreground max-w-md font-medium text-lg">
                      Favorite recipes from the discovery feed to build your personal culinary collection here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* State-Guided AI Creative Mode Prompt Modal Overlay */}
      {showCreativeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-premium max-w-lg w-full mx-4 border border-muted/50 transform animate-in scale-in duration-300 space-y-8 relative overflow-hidden">
            
            {/* Elegant Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center animate-bounce-subtle">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-foreground uppercase">AI Creative Chef</h3>
              <p className="text-base font-bold text-muted-foreground leading-relaxed">
                Do you want to use only the ingredients listed in your ingredient list and in your pantry, or can I add other things?
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setValue('isCreative', true)
                  setValue('isStrict', true)
                  setValue('creativeType', 'strict')
                  setShowCreativeModal(false)
                  handleSubmit(onSuggest)()
                }}
                className="w-full bg-primary hover:bg-primary/95 text-white py-5 px-6 rounded-2xl shadow-lg shadow-primary/10 font-black text-left flex items-center justify-between transition-all hover:scale-[1.02] border border-primary/20 cursor-pointer"
              >
                <div>
                  <span className="block text-sm uppercase tracking-wider">🔒 Use Only My Ingredients</span>
                  <span className="block text-[10px] opacity-80 font-bold mt-0.5">Strict Zero-Waste (fridge & pantry only)</span>
                </div>
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue('isCreative', true)
                  setValue('isStrict', false)
                  setValue('creativeType', 'gourmet')
                  setShowCreativeModal(false)
                  handleSubmit(onSuggest)()
                }}
                className="w-full bg-secondary hover:bg-secondary/95 text-white py-5 px-6 rounded-2xl shadow-lg shadow-secondary/10 font-black text-left flex items-center justify-between transition-all hover:scale-[1.02] border border-secondary/20 cursor-pointer"
              >
                <div>
                  <span className="block text-sm uppercase tracking-wider">🌿 Feel Free To Add Complements</span>
                  <span className="block text-[10px] opacity-80 font-bold mt-0.5">Gourmet Chef (suggest custom additions)</span>
                </div>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowCreativeModal(false)}
                className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== ADD ITEM MODAL ===== */}
      {showAddItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddItemModal(false) }}
        >
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

            {/* Step 1 — Pick a category */}
            {addItemStep === 'categories' && (
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-foreground">Add to Fridge</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Pick a category to browse</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="p-2 rounded-2xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'Produce',  emoji: '🥬', label: 'Vegetables', desc: 'Fruits & greens',    bg: 'hover:bg-emerald-50 hover:border-emerald-200' },
                    { key: 'Proteins', emoji: '🍖', label: 'Meats',      desc: 'Fish, poultry, eggs', bg: 'hover:bg-rose-50 hover:border-rose-200'    },
                    { key: 'Dairy',    emoji: '🥛', label: 'Dairy',      desc: 'Milk, cheese & more',   bg: 'hover:bg-sky-50 hover:border-sky-200'       },
                    { key: 'Pantry',   emoji: '🥫', label: 'Pantry',     desc: 'Grains, oils & more',  bg: 'hover:bg-amber-50 hover:border-amber-200'   },
                  ] as const).map(({ key, emoji, label, desc, bg }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setAddItemCategory(key)
                        setAddItemSearch('')
                        setAddItemStep('ingredients')
                      }}
                      className={`flex flex-col items-start gap-2 p-5 bg-muted/30 border border-muted/50 rounded-3xl transition-all duration-200 active:scale-95 text-left group ${bg}`}
                    >
                      <span className="text-3xl">{emoji}</span>
                      <div>
                        <p className="font-black text-foreground text-base">{label}</p>
                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 — Search + ingredient chips */}
            {addItemStep === 'ingredients' && (() => {
              const allItems = QUICK_SUGGESTIONS[addItemCategory] ?? []
              const alreadyAdded = new Set(
                fridgeItems.filter(f => f.category === addItemCategory).map(f => f.name.toLowerCase())
              )
              const filtered = addItemSearch.trim().length > 0
                ? allItems.filter(s => s.name.toLowerCase().includes(addItemSearch.toLowerCase()))
                : allItems
              const suggestions = addItemSearch.trim().length > 0
                ? allItems.filter(s => s.name.toLowerCase().startsWith(addItemSearch.toLowerCase()) && s.name.toLowerCase() !== addItemSearch.toLowerCase())
                : []

              const categoryMeta: Record<string, { emoji: string; label: string }> = {
                Produce:  { emoji: '🥬', label: 'Vegetables' },
                Proteins: { emoji: '🍖', label: 'Meats'      },
                Dairy:    { emoji: '🥛', label: 'Dairy'      },
                Pantry:   { emoji: '🥫', label: 'Pantry'     },
              }

              const quickAdd = async (name: string, emoji: string) => {
                setIsAddingFridgeItem(true)
                const qty = 'to taste'
                if (isDemoMode) {
                  const newItem: FridgeItem = { id: `demo-${Date.now()}`, name, category: addItemCategory, quantity: qty, needs_restock: false }
                  const updated = [newItem, ...fridgeItems]
                  setFridgeItems(updated)
                  localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
                } else {
                  try {
                    const { item, error, migrationNeeded } = await addFridgeItem(name, addItemCategory, qty)
                    if (migrationNeeded || error || !item) {
                      const newItem: FridgeItem = { id: `local-${Date.now()}`, name, category: addItemCategory, quantity: qty, needs_restock: false }
                      const updated = [newItem, ...fridgeItems]
                      setFridgeItems(updated)
                      localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
                    } else {
                      setFridgeItems(prev => [item, ...prev])
                    }
                  } catch {
                    const newItem: FridgeItem = { id: `local-${Date.now()}`, name, category: addItemCategory, quantity: qty, needs_restock: false }
                    const updated = [newItem, ...fridgeItems]
                    setFridgeItems(updated)
                    localStorage.setItem('cooker_fridge_inventory_v2', JSON.stringify(updated))
                  }
                }
                toast.success(`${emoji} ${name} added to your fridge!`)
                setAddItemSearch('')
                setIsAddingFridgeItem(false)
              }

              return (
                <div className="p-8 space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setAddItemStep('categories'); setAddItemSearch('') }}
                      className="p-2 rounded-2xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1">
                      <h2 className="text-xl font-black text-foreground">
                        {categoryMeta[addItemCategory]?.emoji} {categoryMeta[addItemCategory]?.label}
                      </h2>
                      <p className="text-xs text-muted-foreground">Tap to add instantly</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddItemModal(false)}
                      className="p-2 rounded-2xl hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      placeholder={`Search or type (e.g. "pa" for Pasta)…`}
                      value={addItemSearch}
                      onChange={(e) => setAddItemSearch(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && addItemSearch.trim()) {
                          e.preventDefault()
                          const match = filtered[0]
                          if (match) {
                            await quickAdd(match.name, match.emoji)
                          } else {
                            await quickAdd(addItemSearch.trim().charAt(0).toUpperCase() + addItemSearch.trim().slice(1), '🥘')
                          }
                        }
                      }}
                      className="w-full bg-muted/40 border border-muted-foreground/15 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                    />
                    {/* Autocomplete dropdown */}
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-muted/40 rounded-2xl shadow-xl z-10 overflow-hidden">
                        {suggestions.slice(0, 5).map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => quickAdd(s.name, s.emoji)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-primary/5 transition-colors text-left"
                          >
                            <span className="text-lg">{s.emoji}</span>
                            <span className="text-sm font-bold text-foreground">{s.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground/60 uppercase tracking-wide">tap to add</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ingredient chips */}
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto scrollbar-premium pr-1">
                    {filtered.map((s) => {
                      const inFridge = alreadyAdded.has(s.name.toLowerCase())
                      return (
                        <button
                          key={s.name}
                          type="button"
                          disabled={inFridge}
                          onClick={() => !inFridge && quickAdd(s.name, s.emoji)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all duration-200 active:scale-95",
                            inFridge
                              ? "bg-primary/10 border-primary/20 text-primary/60 cursor-default"
                              : "bg-white border-muted/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
                          )}
                        >
                          <span>{s.emoji}</span>
                          <span>{s.name}</span>
                          {inFridge && <span className="text-[10px] font-black text-primary/60">✓</span>}
                        </button>
                      )
                    })}
                    {filtered.length === 0 && addItemSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => quickAdd(addItemSearch.trim().charAt(0).toUpperCase() + addItemSearch.trim().slice(1), '🥘')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary font-bold text-sm hover:bg-primary/10 transition-colors active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add &ldquo;{addItemSearch.trim()}&rdquo;
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Onboarding Welcome Tutorial Modal Card */}
      {showOnboarding && (
        <div className="fixed bottom-8 right-8 z-50 w-full max-w-sm p-1.5 animate-in slide-in-from-bottom-8 slide-in-from-right-8 duration-500">
          <div className="bg-white/85 backdrop-blur-xl border border-primary/20 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(234,88,12,0.15)] space-y-6 relative overflow-hidden group">
            {/* Glowing background ring */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-all duration-500" />
            
            {/* Step Icon & Header */}
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-primary/10 rounded-2xl text-2xl border border-primary/20 animate-pulse">
                {onboardingStep === 1 && '🧑‍🍳'}
                {onboardingStep === 2 && '🥬'}
                {onboardingStep === 3 && '✨'}
                {onboardingStep === 4 && '🛒'}
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Step {onboardingStep} of 4
                </span>
                <h4 className="font-black text-lg text-foreground leading-tight">
                  {onboardingStep === 1 && "Welcome to COOKER!"}
                  {onboardingStep === 2 && "Stock Your Fridge!"}
                  {onboardingStep === 3 && "Discover Recipes!"}
                  {onboardingStep === 4 && "Find Ingredients!"}
                </h4>
              </div>
            </div>

            {/* Description Text */}
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              {onboardingStep === 1 && "Welcome, Chef! Cooker is your intelligent, AI-powered personal chef assistant. Let's take a quick 1-minute tour to get you ready to cook delicious meals tailored perfectly to what you already have in stock!"}
              {onboardingStep === 2 && "Let us know what ingredients you have! You can manually place ingredients on your Refrigerator Doors and crispers, or upload a photo of your physical fridge to let our AI scan the shelves automatically."}
              {onboardingStep === 3 && "Once your cabinet has ingredients, head to Discover! Our elite AI chef persona engines will craft custom gourmet recipes matched perfectly to your cabinet stock and dietary preferences."}
              {onboardingStep === 4 && "Missing an ingredient for a recipe? Simply click on any ingredient to view real-time maps showing nearby grocery stores that have it in stock. You'll always find what you need!"}
            </p>

            {/* Pagination dots & Navigation actions */}
            <div className="flex items-center justify-between pt-4 border-t border-muted/60">
              {/* Pagination Dots */}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      onboardingStep === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center gap-2">
                {onboardingStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCompleteOnboarding}
                      className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                    <Button
                      type="button"
                      onClick={handleNextOnboarding}
                      className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-md shadow-primary/20"
                    >
                      Next 
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevOnboarding}
                      className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    {onboardingStep === 4 ? (
                      <Button
                        type="button"
                        onClick={handleCompleteOnboarding}
                        className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-md shadow-primary/20 animate-bounce"
                      >
                        Let&apos;s Cook! 🚀
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleNextOnboarding}
                        className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-md shadow-primary/20"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

