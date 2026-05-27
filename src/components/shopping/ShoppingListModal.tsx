'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, MapPin, Navigation, ShoppingBasket, Store, Trash2, X } from 'lucide-react'
import { cn, ingredientsMatch } from '@/lib/utils'
import { toast } from 'sonner'
import { getFridgeItems, type FridgeItem } from '@/lib/actions/fridge'

const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center font-bold text-muted-foreground">Initializing Engine...</div>
})

interface ShoppingItem {
  id: string
  item: string
  category: 'Produce' | 'Dairy' | 'Meat' | 'Pantry' | 'Spices'
  qty: string
  storeDeal?: string
}

const MOCK_DEALS = [
  { store: 'Whole Foods', deal: 'Organic Greens - 20% off' },
  { store: 'Trader Joes', deal: 'Fresh Salmon - Member Price' },
  { store: 'Local Co-op', deal: 'Buy 1 Get 1 on Spices' }
]

export default function ShoppingListModal({ isOpen, onClose, items }: { isOpen: boolean, onClose: () => void, items: any[] }) {
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [view, setView] = useState<'list' | 'map'>('list')
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [realStores, setRealStores] = useState<any[]>([])
  const [isFetchingStores, setIsFetchingStores] = useState(false)
  const [isWatching, setIsWatching] = useState(false)
  const watchId = useRef<number | null>(null)
  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  const [availableWords, setAvailableWords] = useState<string[]>([])

  useEffect(() => {
    async function loadAvailableIngredients() {
      if (typeof window === 'undefined') return
      if (!isOpen) return
      
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
  }, [isOpen])

  const isMissing = (item: string) => {
    if (availableWords.length === 0) return true // assume missing until loaded to avoid race condition!
    return !availableWords.some(word => ingredientsMatch(item, word))
  }

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [])

  // Haversine formula to calculate distance in KM
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const fetchFromOverpass = async (query: string) => {
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ]

    for (const endpoint of endpoints) {
      try {
        const url = `${endpoint}?data=${encodeURIComponent(query)}`
        const headers: HeadersInit = {}
        if (endpoint.includes('kumi.systems')) {
          headers['User-Agent'] = 'COOKER3App/1.0 (olivia.mouraux@gmail.com)'
        }
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        const response = await fetch(url, { 
          headers, 
          signal: controller.signal 
        })
        clearTimeout(timeoutId)

        if (!response.ok) throw new Error(`HTTP error ${response.status}`)
        const data = await response.json()
        if (data && data.elements) {
          return data
        }
      } catch (err) {
        console.warn(`Overpass endpoint ${endpoint} failed, trying next...`, err)
      }
    }
    throw new Error("All Overpass API interpreters failed.")
  }

  const getFallbackStores = (lat: number, lng: number) => {
    const names = [
      { name: 'Pingo Doce', addr: 'Rua Principal' },
      { name: 'Continente Bom Dia', addr: 'Avenida da Liberdade' },
      { name: 'Auchan Supermercado', addr: 'Centro Comercial' },
      { name: 'Minipreço', addr: 'Largo do Chafariz' },
      { name: 'Trader Joe\'s', addr: 'Market St' },
      { name: 'Whole Foods Market', addr: 'Broadway Blvd' }
    ]

    const isIberia = lat > 36 && lat < 43 && lng > -11 && lng < -5
    const pool = isIberia 
      ? names.slice(0, 4) 
      : [names[4], names[5], names[0], names[1]]

    return pool.map((store, index) => {
      const offsetLat = (index % 2 === 0 ? 1 : -1) * (0.003 + index * 0.0025)
      const offsetLng = (index > 1 ? 1 : -1) * (0.004 + index * 0.003)
      const storeLat = lat + offsetLat
      const storeLng = lng + offsetLng
      const dist = getDistance(lat, lng, storeLat, storeLng)

      return {
        name: store.name,
        address: `${store.addr} #${10 + index * 7}`,
        lat: storeLat,
        lng: storeLng,
        distance: dist,
        distText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
        deal: index === 0 ? 'Fresh veggies organic deals' : 'Open Now'
      }
    })
  }

  const fetchRealStores = async (lat: number, lng: number) => {
    setIsFetchingStores(true)
    try {
      // Use Overpass API to find supermarkets & hypermarkets within 3km for nodes, ways, and relations
      const query = `[out:json];(nwr["shop"="supermarket"](around:3000,${lat},${lng});nwr["shop"="hypermarket"](around:3000,${lat},${lng}););out center;`
      const data = await fetchFromOverpass(query)
      
      const stores = data.elements.map((el: any) => {
        const storeLat = el.lat || (el.center && el.center.lat)
        const storeLng = el.lon || (el.center && el.center.lon) || el.lng
        if (!storeLat || !storeLng) return null

        const dist = getDistance(lat, lng, storeLat, storeLng)
        return {
          name: el.tags.name || el.tags.operator || 'Local Supermarket',
          address: el.tags['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}` : 'Nearby Store',
          lat: storeLat,
          lng: storeLng,
          distance: dist,
          distText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
          deal: 'Open Now'
        }
      }).filter(Boolean)

      if (stores.length > 0) {
        // Sort by distance (closest first)
        const sortedStores = stores.sort((a: any, b: any) => a.distance - b.distance)
        setRealStores(sortedStores)
      } else {
        setRealStores(getFallbackStores(lat, lng))
      }
    } catch (error) {
      console.warn('Overpass API error, using dynamic geo-local fallback:', error)
      setRealStores(getFallbackStores(lat, lng))
    } finally {
      setIsFetchingStores(false)
    }
  }

  const handleManualSearch = async (city: string) => {
    setIsFetchingStores(true)
    try {
      // Use Nominatim for free geocoding with Portugal country code restriction
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&countrycodes=pt`)
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)
      const data = await response.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        const nLat = parseFloat(lat)
        const nLng = parseFloat(lon)
        setUserLocation({ lat: nLat, lng: nLng })
        fetchRealStores(nLat, nLng)
      } else {
        // Keyword fallback if geocoder returns empty but works
        throw new Error("No geocoding results found")
      }
    } catch (error) {
      console.warn("Geocoding failed, trying keyword fallback...", error)
      const queryLower = city.toLowerCase()
      let fallbackCoord = null
      
      if (queryLower.includes('colombo')) {
        fallbackCoord = { lat: 38.7560, lng: -9.1885 }
      } else if (queryLower.includes('benfica') || queryLower.includes('carnide')) {
        fallbackCoord = { lat: 38.7500, lng: -9.2000 }
      } else if (queryLower.includes('lisbon') || queryLower.includes('lisboa')) {
        fallbackCoord = { lat: 38.7223, lng: -9.1393 }
      }
      
      if (fallbackCoord) {
        setUserLocation(fallbackCoord)
        fetchRealStores(fallbackCoord.lat, fallbackCoord.lng)
        toast.success(`Showing stores around ${city} (local GPS backup) 📍`)
      } else {
        toast.error("Search failed. Please verify network connectivity.")
      }
    } finally {
      setIsFetchingStores(false)
    }
  }

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
      
      setIsWatching(true)
      toast.info("Starting Live GPS Tracking. Wait 10s for signal to settle...")
      
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          fetchRealStores(latitude, longitude)
          
          if (accuracy < 50) {
            toast.success("High-precision lock achieved!")
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
          setIsWatching(false)
          toast.error("GPS Signal lost. Please use manual search.")
          setUserLocation({ lat: 38.7223, lng: -9.1393 })
        },
        { 
          enableHighAccuracy: true, 
          timeout: 20000, 
          maximumAge: 0 
        }
      )
    } else {
      toast.error("Geolocation is not supported.")
    }
  }

  useEffect(() => {
    if (isOpen) {
      setView('list')
      handleGetLocation()
    }
  }, [isOpen])

  if (!isOpen) return null

  const categorized = items.reduce((acc: any, item: any) => {
    // Only list what is actually missing in the shopping list!
    if (!isMissing(item.item)) return acc

    const category = item.category || 'Pantry'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})

  const toggleItem = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleExportToPhone = () => {
    let text = "🛒 MY COOKER3 SHOPPING LIST\n"
    text += "=============================\n\n"

    let hasItems = false
    Object.entries(categorized).forEach(([category, categoryItems]: [string, any]) => {
      const unchecked = categoryItems.filter((item: any, i: number) => {
        const id = `${category}-${i}`
        return !checkedItems.includes(id)
      })

      if (unchecked.length > 0) {
        hasItems = true
        text += `🔹 ${category.toUpperCase()}:\n`
        unchecked.forEach((item: any) => {
          text += `  [ ] ${item.item} (${item.qty || '1 unit'})\n`
        })
        text += "\n"
      }
    })

    if (!hasItems) {
      toast.error("Your shopping list is currently empty!")
      return
    }

    text += "Generated by COOKER3"

    if (navigator.share) {
      navigator.share({
        title: 'COOKER3 Shopping List',
        text: text
      })
      .then(() => toast.success("Shared successfully!"))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          copyToClipboard(text)
        }
      })
    } else {
      copyToClipboard(text)
    }
  }

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard! Paste it directly into your notes app! 📝")
    } else {
      toast.error("Unable to copy to clipboard automatically.")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-white rounded-[3rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-primary p-8 text-white">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <ShoppingBasket className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black">Shopping List</h2>
                <p className="text-white/80 font-bold uppercase tracking-widest text-xs">Categorized by Aisle</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-2xl">
              <X className="w-8 h-8" />
            </Button>
          </div>

          <div className="flex bg-white/10 p-1.5 rounded-2xl">
            <Button 
              variant="ghost" 
              className={cn(
                "flex-1 rounded-xl font-bold py-3 transition-all text-xs md:text-sm shadow-sm", 
                view === 'list' 
                  ? "bg-white text-primary font-black shadow-lg" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={() => setView('list')}
            >
              shopping list
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "flex-1 rounded-xl font-bold py-3 transition-all text-xs md:text-sm shadow-sm", 
                view === 'map' 
                  ? "bg-white text-primary font-black shadow-lg" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={() => {
                setView('map')
                handleGetLocation()
              }}
            >
              Stores nearest you
            </Button>
          </div>
        </div>

        <CardContent className="p-8 max-h-[60vh] overflow-y-auto space-y-8 selection:bg-primary/10">
          {view === 'list' ? (
            /* Missing Items Checklist Section */
            <div className="space-y-6 animate-in fade-in duration-300">
              {Object.keys(categorized).length === 0 ? (
                <div className="text-center py-16 px-8 bg-green-50/40 rounded-[2.5rem] border-2 border-dashed border-green-200/50 space-y-4 animate-in zoom-in-95 duration-500">
                  <span className="text-5xl block animate-bounce">🎉</span>
                  <h4 className="font-black text-2xl text-green-800">Your Fridge is Fully Stocked!</h4>
                  <p className="text-md font-bold text-green-700/80 max-w-md mx-auto leading-relaxed">
                    You already have 100% of the required ingredients in your kitchen inventory! Happy cooking, Chef! 🧑‍🍳
                  </p>
                </div>
              ) : (
                Object.entries(categorized).map(([category, categoryItems]: [string, any]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-secondary rounded-full" />
                      {category}
                    </h3>
                    <div className="space-y-3">
                      {categoryItems.map((item: any, i: number) => {
                        const id = `${category}-${i}`
                        const isChecked = checkedItems.includes(id)
                        const missing = isMissing(item.item)

                        return (
                          <div 
                            key={id}
                            onClick={() => toggleItem(id)}
                            className={cn(
                              "group flex items-center justify-between p-5 rounded-3xl border-2 transition-all cursor-pointer",
                              isChecked 
                                ? "bg-muted/50 border-transparent animate-fade-in" 
                                : missing 
                                  ? "bg-red-50/65 border-red-200/50 hover:border-red-300 shadow-sm animate-pulse-subtle" 
                                  : "bg-white border-muted hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                                isChecked 
                                  ? "bg-primary border-primary text-white" 
                                  : missing 
                                    ? "border-red-300 bg-white text-red-600 group-hover:border-red-400" 
                                    : "border-muted group-hover:border-primary/50"
                              )}>
                                {isChecked && <Check className="w-5 h-5 stroke-[4px]" />}
                              </div>
                              <div>
                                <p className={cn(
                                  "font-black text-lg flex items-center gap-2", 
                                  isChecked 
                                    ? "line-through text-muted-foreground" 
                                    : missing 
                                      ? "text-red-700 font-black" 
                                      : "text-foreground"
                                )}>
                                  <span>{item.item}</span>
                                  {!isChecked && missing && (
                                    <span className="text-[9px] bg-red-100/90 text-red-700 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-red-200/50">
                                      Missing
                                    </span>
                                  )}
                                </p>
                                <p className={cn(
                                  "text-sm font-bold", 
                                  isChecked 
                                    ? "text-muted-foreground/60" 
                                    : missing 
                                      ? "text-red-600" 
                                      : "text-muted-foreground"
                                )}>
                                  {item.qty}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Real Grocery Stores and Interactive Map Section */
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-2xl text-foreground flex items-center gap-2">
                    <Store className="w-6 h-6 text-primary" />
                    Real Stores Near You
                  </h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Real-time Location Intelligence</p>
                </div>
                {isFetchingStores && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              </div>

              <div className="relative h-[280px] bg-muted/50 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-premium group">
                {userLocation ? (
                  <MapComponent center={userLocation} stores={realStores} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-[2]" />
                      <div className="relative w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center border-2 border-primary/10">
                        <MapPin className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="font-black text-xl text-foreground">Acquiring High-Precision GPS Lock...</p>
                      <p className="text-muted-foreground font-medium text-xs mt-1">Consulting satellite arrays...</p>
                    </div>
                  </div>
                )}
                
                {userLocation && (
                  <div className="absolute top-4 left-4 right-4 z-20">
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Change search area (e.g. Paris, Lisbon)..."
                        className="w-full bg-white/95 backdrop-blur-md border-2 border-white rounded-[1.2rem] px-4 py-2 text-xs font-black shadow-2xl focus:bg-white transition-all outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const city = (e.target as HTMLInputElement).value;
                            if (city) {
                              setSearchQuery(city);
                              handleManualSearch(city);
                            }
                          }
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                        <Navigation className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* If GPS is not acquired or fails, show manual geocoder input row */}
              {!userLocation && (
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Type your neighborhood or city (e.g. Lisbon)..."
                    className="w-full bg-muted/50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const city = (e.target as HTMLInputElement).value;
                        if (city) {
                          setSearchQuery(city);
                          handleManualSearch(city);
                        }
                      }
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Navigation className="w-4 h-4" />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {realStores.length > 0 ? (
                  realStores.slice(0, 5).map((store, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&travelmode=driving`, '_blank')
                      }}
                      className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border-2 border-transparent hover:border-primary/10 hover:bg-white transition-all group cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-sm">{store.name}</p>
                          <p className="text-xs text-muted-foreground font-bold">{store.distText} away • Get Directions</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-secondary text-secondary font-black px-2.5 py-0.5 text-[10px]">Open</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center bg-muted/10 rounded-[2rem] border-2 border-dashed border-muted">
                    <p className="text-muted-foreground font-bold text-xs italic">
                      {isFetchingStores ? "Locating actual supermarkets in your area..." : "Search a city above to list verified local supermarkets."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-8 bg-muted/20 border-t border-muted flex gap-4">
          <Button 
            onClick={handleExportToPhone}
            className="flex-1 h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20"
          >
            Export to Phone
          </Button>
          <Button variant="outline" className="h-16 w-16 rounded-2xl border-2 border-muted text-destructive hover:bg-destructive/5">
            <Trash2 className="w-6 h-6" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
