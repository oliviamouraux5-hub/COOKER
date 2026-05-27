'use client'

import { Apple, Carrot, Egg, Fish, Refrigerator } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChefLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-12">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Glowing Background Ring */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        
        {/* Brocolini Mascot (Center) */}
        <div className="relative z-10 p-4 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-premium border-4 border-white animate-bounce-slow w-32 h-32 flex items-center justify-center overflow-hidden">
          <img 
            src="/brocolini.png" 
            alt="Chef Brocolini" 
            className="w-full h-full object-contain transform scale-110"
          />
        </div>

        {/* Orbiting Ingredients */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 p-3 bg-secondary/10 backdrop-blur-md rounded-2xl text-secondary shadow-lg animate-float-delayed">
            <Apple className="w-8 h-8" />
          </div>
        </div>

        <div className="absolute inset-0 animate-spin-slow-reverse">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 p-3 bg-orange-500/10 backdrop-blur-md rounded-2xl text-orange-500 shadow-lg animate-float">
            <Carrot className="w-8 h-8" />
          </div>
        </div>

        <div className="absolute inset-0 animate-spin-medium">
          <div className="absolute top-1/2 left-0 -translate-x-4 -translate-y-1/2 p-3 bg-blue-500/10 backdrop-blur-md rounded-2xl text-blue-500 shadow-lg animate-float-delayed">
            <Fish className="w-8 h-8" />
          </div>
        </div>

        <div className="absolute inset-0 animate-spin-medium-reverse">
          <div className="absolute top-1/2 right-0 translate-x-4 -translate-y-1/2 p-3 bg-yellow-500/10 backdrop-blur-md rounded-2xl text-yellow-500 shadow-lg animate-float">
            <Egg className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h3 className="text-3xl font-black text-foreground italic tracking-tighter uppercase">
          Whipping up something magical
        </h3>
        <p className="text-muted-foreground font-bold animate-pulse text-lg">
          Chef Brocolini is crafting your custom gourmet recipe...
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes float {
          0%, 100% { transform: translate(-50%, 0) rotate(0deg); }
          50% { transform: translate(-50%, -15px) rotate(10deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 10s linear infinite;
        }
        .animate-spin-medium {
          animation: spin-slow 6s linear infinite;
        }
        .animate-spin-medium-reverse {
          animation: spin-slow-reverse 7s linear infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
