"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight } from "lucide-react"

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    login,
    signup,
    loginWithGoogle,
  } = useAuth()

  const [mode, setMode] = useState<"login" | "signup">(authModalMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await signup(email, password, name)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 z-50 rounded-2xl shadow-2xl backdrop-blur-xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 mb-1">
            <TrebleClefIcon className="size-7 fill-current" />
          </div>
          <DialogTitle className="text-xl font-mono font-black tracking-tight text-white">
            {mode === "login" ? "Welcome Back to BandMate" : "Create Your Song Lab Account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            {mode === "login"
              ? "Sign in to access your saved chord progressions and cloud setlists."
              : "Save your songs permanently across devices and unlock full studio features."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 my-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase transition-all cursor-pointer ${
              mode === "login"
                ? "bg-amber-400 text-black shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-amber-400 text-black shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Display Name / Artist Handle
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="e.g. Jimi Hendrix"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 bg-zinc-900/80 border-zinc-800 text-xs font-bold text-white focus:border-amber-400 h-10 rounded-xl"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-zinc-500" />
              <Input
                type="email"
                placeholder="musician@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-zinc-900/80 border-zinc-800 text-xs font-bold text-white focus:border-amber-400 h-10 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-zinc-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-zinc-900/80 border-zinc-800 text-xs font-bold text-white focus:border-amber-400 h-10 rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-amber-400 text-black hover:bg-amber-300 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 cursor-pointer gap-2 mt-4"
          >
            <span>{mode === "login" ? "Sign In to Studio" : "Create My Account"}</span>
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
            <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
          </div>
        </div>

        {/* Social / Google Login Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => loginWithGoogle()}
          className="w-full h-10 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold text-xs rounded-xl cursor-pointer gap-2"
        >
          <Sparkles className="size-4 text-amber-400" />
          <span>Continue with Google</span>
        </Button>
      </DialogContent>
    </Dialog>
  )
}
