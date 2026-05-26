'use client'

import Link from 'next/link'
import { ChefHat, Utensils, Zap, ShieldCheck, ArrowRight, Play, Star, BookOpen, Sparkles, MapPin } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Premium Navbar */}
      <header className="px-6 lg:px-12 h-24 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50 border-b border-primary/10">
        <Link className="flex items-center gap-2 group" href="/">
          <div className="p-2 bg-primary rounded-xl group-hover:rotate-12 transition-transform">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-heading font-black tracking-tight text-foreground">COOKER</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link className="text-sm font-bold hover:text-primary transition-colors" href="#how-it-works">How it Works</Link>
          <Link className="text-sm font-bold hover:text-primary transition-colors" href="#features">Features</Link>
          <Link className="text-sm font-bold hover:text-primary transition-colors" href="#testimonials">Community</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link className="hidden sm:block text-sm font-bold hover:text-primary" href="/login">Login</Link>
          <Link 
            href="/signup" 
            className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90 text-white px-6 py-5 rounded-2xl shadow-lg shadow-primary/20 font-bold flex items-center")}
          >
            Sign Up
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Velonto-style Hero Section */}
        <section className="w-full py-12 lg:py-24 px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in slide-in-from-left duration-700">
              <Badge className="bg-primary/10 text-primary border-none px-4 py-2 text-sm font-bold rounded-full">
                #1 Virtual Chef Assistant
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tighter text-foreground text-balance">
                Fresh <span className="text-primary">Ingredients</span> Delivered to Your <span className="text-secondary">Creativity</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                COOKER turns your leftover ingredients into a five-star dining experience. Scan, cook, and enjoy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/signup" 
                  className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90 text-white px-10 py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 font-black group flex items-center")}
                >
                  Get Started <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Button 
                  variant="ghost" 
                  className="px-8 py-8 text-lg font-bold flex items-center gap-3"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="p-3 bg-white rounded-full shadow-md text-primary">
                    <Play className="fill-current w-5 h-5" />
                  </div>
                  See it in action
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-8 border-t border-border">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-muted overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-bold text-foreground">12k+ Happy Chefs</p>
                  <div className="flex items-center text-primary">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    <span className="ml-2 text-muted-foreground text-sm font-bold">4.9 (2k reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Hero Image Section */}
            <div className="relative animate-in slide-in-from-right duration-1000">
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl shadow-black/10">
                <img 
                  src="/hero-gnocchi.jpg" 
                  alt="Delicious Premium Gnocchi" 
                  className="w-full aspect-[4/5] object-cover"
                />
              </div>
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce-subtle">
                <div className="p-3 bg-green-100 rounded-2xl text-green-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quality</p>
                  <p className="font-bold text-lg">100% Fresh</p>
                </div>
              </div>
              <div className="absolute top-1/4 -right-8 bg-white p-6 rounded-3xl shadow-2xl space-y-2 animate-float">
                <div className="flex items-center gap-1 text-primary">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <p className="font-bold">"Best recipes ever!"</p>
                <p className="text-xs text-muted-foreground">— Chef Gordon</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="how-it-works" className="py-24 bg-white/50 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight">How it <span className="text-primary">Works</span></h2>
              <p className="text-muted-foreground max-w-lg mx-auto font-medium">Simple steps to culinary perfection.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Utensils, title: "Scan Fridge", desc: "Just snap a photo of your ingredients and we'll handle the rest.", color: "bg-primary/10 text-primary", href: "/dashboard" },
                { icon: Zap, title: "Get Recipes", desc: "Browse our hand-crafted culinary library or generate custom AI recipes instantly.", color: "bg-secondary/20 text-secondary", href: "/dashboard" },
                { icon: MapPin, title: "Locate Stores", desc: "Find nearby grocery stores on our interactive map to gather any missing items.", color: "bg-orange-500/10 text-orange-600", href: "/dashboard?tab=map" },
                { icon: ChefHat, title: "Cook & Enjoy", desc: "Follow our distraction-free guide to a perfect meal.", color: "bg-primary/20 text-primary", href: "/dashboard" }
              ].map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href}
                  className="flex flex-col items-center text-center space-y-6 group p-6 rounded-[2.5rem] bg-white/40 hover:bg-white border-2 border-transparent hover:border-primary/5 hover:shadow-premium transition-all duration-500 cursor-pointer block"
                >
                  <div className={`p-6 ${item.color} rounded-3xl group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-sm">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Dual Mode Feature Section: AI Recipes & Premium Curated Library */}
        <section className="py-24 bg-gradient-to-b from-white to-background px-6 lg:px-12 border-t border-b border-primary/5">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
                Two Powerful Ways to <span className="text-primary">Cook</span>
              </h2>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                Whether you want custom recipes based on leftovers or curated gourmet recipes from our professional catalog, we have you covered.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Card 1: AI Engine */}
              <div className="bg-white p-12 rounded-[3.5rem] shadow-premium border border-primary/5 hover:border-primary/20 hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group">
                <div className="space-y-6">
                  <div className="p-5 bg-primary/10 text-primary rounded-3xl w-fit group-hover:scale-105 transition-transform duration-300">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-foreground italic">Instant AI Recipe Creator</h3>
                  <p className="text-muted-foreground text-md font-medium leading-relaxed">
                    Have random leftovers or fresh perishables? Simply snap a photo of your fridge or list your items. Our smart chef engine dynamically builds custom step-by-step recipes matching your exact dietary preferences and pantry drawer instantly.
                  </p>
                </div>
                <div className="pt-10 flex items-center text-primary font-black text-sm uppercase tracking-wider gap-2">
                  <span>Smart Leftover Engine</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 2: Library */}
              <div className="bg-white p-12 rounded-[3.5rem] shadow-premium border border-primary/5 hover:border-secondary/20 hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group">
                <div className="space-y-6">
                  <div className="p-5 bg-secondary/15 text-secondary rounded-3xl w-fit group-hover:scale-105 transition-transform duration-300">
                    <BookOpen className="w-10 h-10 text-secondary" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-foreground italic">Curated Culinary Library</h3>
                  <p className="text-muted-foreground text-md font-medium leading-relaxed">
                    Prefer classic, time-tested gourmet delicacies? Browse our comprehensive recipes library. Filter by difficulty, cook time, dietary regimes, or tags. Follow distraction-free cooking modes with voice narration support.
                  </p>
                </div>
                <div className="pt-10 flex items-center text-secondary font-black text-sm uppercase tracking-wider gap-2">
                  <span>Gourmet Recipe Library</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-24 px-6 lg:px-12 bg-background">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight">Loved by <span className="text-secondary">Home Chefs</span></h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: "Sarah L.", role: "Busy Parent", text: "COOKER saved my weeknight dinners. I never knew I could make so much with just some eggs and spinach!" },
                { name: "Marcus T.", role: "Student", text: "Finally an app that understands my budget and what's actually in my tiny fridge." },
                { name: "Elena R.", role: "Foodie", text: "The AI chef personas are hilarious and actually give great culinary advice. 10/10." }
              ].map((t, i) => (
                <div key={i} className="bg-white p-10 rounded-[3rem] shadow-premium space-y-6 border border-primary/5 hover:-translate-y-2 transition-transform duration-500">
                  <div className="flex text-secondary">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-lg font-medium italic text-muted-foreground">"{t.text}"</p>
                  <div>
                    <p className="font-black text-foreground">{t.name}</p>
                    <p className="text-sm text-primary font-bold">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features / CTA Section */}
        <section id="features" className="py-24 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto bg-primary rounded-[4rem] p-12 lg:p-24 text-center space-y-10 shadow-2xl shadow-primary/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-5xl lg:text-7xl font-black text-white leading-tight">Ready to start your <br/> <span className="text-black/20">culinary adventure?</span></h2>
              <p className="text-white/80 text-xl max-w-xl mx-auto font-medium">Join thousands of chefs today and turn your fridge into a gourmet kitchen.</p>
              <div className="pt-8">
                <Link 
                  href="/signup" 
                  className="bg-white text-primary hover:bg-white/90 px-16 py-8 text-2xl rounded-[2rem] shadow-2xl font-black inline-flex items-center transition-all hover:scale-105"
                >
                  Join COOKER Now <ArrowRight className="ml-3 w-8 h-8" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-primary/10 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Link className="flex items-center gap-2 group" href="/">
            <div className="p-2 bg-primary rounded-xl group-hover:rotate-12 transition-transform">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-heading font-black tracking-tight text-foreground">COOKER</span>
          </Link>
          <div className="flex gap-8">
            <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors" href="#how-it-works">Process</Link>
            <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors" href="#testimonials">Reviews</Link>
            <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors" href="/login">Login</Link>
          </div>
          <p className="text-muted-foreground font-medium italic text-sm">© 2026 COOKER. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
