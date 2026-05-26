'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChefHat, ChevronLeft, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchRecipes() {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setRecipes(data)
      }
      setIsLoading(false)
    }

    fetchRecipes()
  }, [])

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-premium">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 hover:rotate-6 transition-transform">
              <ChefHat className="text-white w-8 h-8" />
            </Link>
            <div className="h-12 w-px bg-muted hidden md:block" />
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="text-foreground hover:bg-muted rounded-2xl h-14 w-14">
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <div>
              <h1 className="text-4xl font-black text-foreground">My <span className="text-primary">Collection</span></h1>
              <p className="text-muted-foreground font-medium">Your personal digital cookbook</p>
            </div>
          </div>
          <Link 
            href="/recipes/new" 
            className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90 text-white font-black rounded-2xl px-10 py-7 text-lg shadow-xl shadow-primary/20 flex items-center")}
          >
            <Plus className="w-6 h-6 mr-2" /> Create New
          </Link>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : recipes.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="border-none shadow-premium bg-white rounded-[2.5rem] group hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                <div className="h-64 bg-muted relative overflow-hidden">
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-20 h-20 text-primary/10" />
                    </div>
                  )}
                  {!recipe.is_public && (
                    <Badge className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white border-none font-bold">Private</Badge>
                  )}
                </div>
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-2xl font-black">{recipe.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <Link 
                    href={`/recipes/${recipe.id}`}
                    className={cn(buttonVariants({ variant: "secondary" }), "w-full bg-secondary hover:bg-secondary/90 text-white font-black py-7 rounded-2xl shadow-lg shadow-secondary/10 flex items-center justify-center")}
                  >
                    View Details
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white/40 rounded-[3rem] border-4 border-dashed border-primary/10">
            <div className="p-10 bg-white rounded-full shadow-premium mb-8">
              <ChefHat className="w-16 h-16 text-primary/20" />
            </div>
            <h3 className="text-3xl font-black text-foreground">Your cookbook is empty</h3>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium mb-10 text-lg">Start by creating your first recipe or use the AI chef to get inspired!</p>
            <Link 
              href="/recipes/new" 
              className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90 text-white px-12 py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 font-black flex items-center")}
            >
              Create Recipe
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
