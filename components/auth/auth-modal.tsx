"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, X } from "lucide-react"

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

  if (!isAuthModalOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-2">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 mb-1">
            <TrebleClefIcon className="size-7 fill-current" />
          </div>
          <h2 className="text-xl font-mono font-black tracking-tight text-white">
            {mode === "login" ? "Sign In to BandMate" : "Create Your Song Lab Account"}
          </h2>
          <p className="text-xs text-zinc-400">
            {mode === "login"
              ? "Sign in to save your chord progressions & sync songs across devices."
              : "Save your songs permanently across devices and unlock full studio features."}
          </p>
        </div>

        {/* PRIMARY ACTION: Google Sign In First at the Top! */}
        <div className="mt-4 mb-3 space-y-2">
          <Button
            type="button"
            onClick={() => loginWithGoogle()}
            className="w-full h-11 bg-white text-black hover:bg-zinc-100 font-bold text-xs rounded-xl cursor-pointer gap-3 shadow-lg shadow-white/10 flex items-center justify-center border border-zinc-200 transition-all hover:scale-[1.01]"
          >
            {/* Google Logo SVG */}
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
              Continue with Google
            </span>
          </Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
            <span className="bg-zinc-950 px-3 text-zinc-400 font-bold">Or sign in with email</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 my-3">
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
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
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
      </div>
    </div>
  )
}
