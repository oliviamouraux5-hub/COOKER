'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChefHat, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const email = formData.get('email') as string
      const password = formData.get('password') as string

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        setIsLoading(false)
      } else {
        toast.success('Welcome back, Chef!')
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error("Login onSubmit caught error:", err)
      toast.error(err.message || "An unexpected error occurred during sign in.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg border-none shadow-premium bg-white p-8 rounded-[3rem] animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
            <ChefHat className="w-10 h-10" />
          </div>
          <CardTitle className="text-4xl font-black tracking-tight">Welcome <span className="text-primary">Back</span></CardTitle>
          <CardDescription className="text-lg font-medium text-muted-foreground">Sign in to continue your culinary journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} method="POST" className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-lg font-bold ml-2 text-foreground/80">Email Address</Label>
                 <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="chef@cooker.com" 
                  required 
                  className="w-full h-16 bg-muted/50 border-none rounded-2xl px-6 text-lg font-medium focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <Label htmlFor="password" className="text-lg font-bold text-foreground/80">Password</Label>
                  <button 
                    type="button"
                    onClick={() => toast.info("Password recovery is coming soon!")}
                    className="text-sm font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="w-full h-16 bg-muted/50 border-none rounded-2xl px-6 text-lg font-medium focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-xl rounded-2xl shadow-xl shadow-primary/20 font-black cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center border-none" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-muted"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-xs font-black uppercase tracking-wider">Or Quick Demo</span>
              <div className="flex-grow border-t border-muted"></div>
            </div>

            <button 
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('cooker_recipes')
                  localStorage.removeItem('cooker_active_recipe')
                  localStorage.removeItem('cooker_hasSearched')
                }
                document.cookie = "cooker_session=demo; path=/; max-age=86400"
                toast.success('Entering Demo Mode!')
                router.push('/dashboard')
              }}
              className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-xl rounded-2xl shadow-xl shadow-secondary/20 font-black cursor-pointer transition-all flex items-center justify-center border-none"
            >
              🚀 Launch Demo Mode
            </button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6 text-center border-t border-muted">
          <p className="text-muted-foreground font-medium">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary font-black hover:underline">
              Join the club
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
