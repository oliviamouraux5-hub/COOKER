'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChefHat, Loader2 } from 'lucide-react'

export default function SignupPage() {
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

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message)
        setIsLoading(false)
      } else {
        toast.success('Welcome to the kitchen, Chef!')
        router.push('/profile/setup')
      }
    } catch (err: any) {
      console.error("Signup onSubmit caught error:", err)
      toast.error(err.message || "An unexpected error occurred during account creation.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg border-none shadow-premium bg-white p-8 rounded-[3rem] animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-secondary rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-secondary/20 -rotate-3">
            <ChefHat className="w-10 h-10" />
          </div>
          <CardTitle className="text-4xl font-black tracking-tight">Join the <span className="text-secondary">Club</span></CardTitle>
          <CardDescription className="text-lg font-medium text-muted-foreground">Start your culinary journey with COOKER</CardDescription>
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
                  className="w-full h-16 bg-muted/50 border-none rounded-2xl px-6 text-lg font-medium focus:ring-2 focus:ring-secondary/20 outline-none text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-lg font-bold ml-2 text-foreground/80">Password</Label>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="w-full h-16 bg-muted/50 border-none rounded-2xl px-6 text-lg font-medium focus:ring-2 focus:ring-secondary/20 outline-none text-foreground"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-xl rounded-2xl shadow-xl shadow-secondary/20 font-black cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center border-none" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6 text-center border-t border-muted">
          <p className="text-muted-foreground font-medium">
            Already a member?{' '}
            <Link href="/login" className="text-secondary font-black hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
