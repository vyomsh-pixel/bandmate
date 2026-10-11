"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"
import { recordStudioConsent } from "./studio-gate"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, X, ShieldCheck } from "lucide-react"

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
  const [consentStorage, setConsentStorage] = useState(true)
  const [consentCreativeAid, setConsentCreativeAid] = useState(true)

  // Sync mode state with authModalMode prop/context
  useEffect(() => {
    setMode(authModalMode)
  }, [authModalMode])

  // Escape key handler to close modal
  useEffect(() => {
    if (!isAuthModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAuthModal()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isAuthModalOpen, closeAuthModal])

  if (!isAuthModalOpen) return null

  const canProceed = consentStorage && consentCreativeAid && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canProceed) return
    setIsSubmitting(true)

    try {
      const ok =
        mode === "login"
          ? await login(email, password)
          : await signup(email, password, name)
      if (ok) {
        recordStudioConsent()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!canProceed) return
    setIsSubmitting(true)
    try {
      const ok = await loginWithGoogle()
      if (ok) {
        recordStudioConsent()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeAuthModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
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
          <h2 id="auth-modal-title" className="text-xl font-mono font-black tracking-tight text-white">
            {mode === "login" ? "Sign In to BandMate" : "Create Your Song Lab Account"}
          </h2>
          <p className="text-xs text-zinc-400">
            {mode === "login"
              ? "Sign in to save your chord progressions & migrate guest tracks to your studio vault."
              : "Save your songs permanently in your studio vault and unlock full account portability."}
          </p>
        </div>

        {/* PRIMARY ACTION: Google Sign In First at the Top */}
        <div className="mt-4 mb-3 space-y-2">
          <Button
            type="button"
            disabled={!canProceed}
            onClick={handleGoogleSignIn}
            className="w-full h-11 bg-white text-black hover:bg-zinc-100 disabled:opacity-40 font-bold text-xs rounded-xl cursor-pointer gap-3 shadow-lg shadow-white/10 flex items-center justify-center border border-zinc-200 transition-all hover:scale-[1.01]"
          >
            {/* Google Logo SVG */}
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              <label
                htmlFor="auth-modal-name"
                className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400"
              >
                Display Name / Artist Handle
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-zinc-500" />
                <Input
                  id="auth-modal-name"
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
            <label
              htmlFor="auth-modal-email"
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-zinc-500" />
              <Input
                id="auth-modal-email"
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
            <label
              htmlFor="auth-modal-password"
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-zinc-500" />
              <Input
                id="auth-modal-password"
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
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Studio Consent & Disclaimers */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 text-[11px] text-zinc-300">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-amber-400">
              <ShieldCheck className="size-3.5" />
              <span>Studio Data &amp; Creative Aid Consent</span>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentStorage}
                onChange={(e) => setConsentStorage(e.target.checked)}
                className="mt-0.5 size-3.5 rounded accent-amber-400 cursor-pointer shrink-0"
              />
              <span>
                I consent to BandMate caching studio soundfont samples in browser IndexedDB and storing my chord progressions in local/account storage.
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentCreativeAid}
                onChange={(e) => setConsentCreativeAid(e.target.checked)}
                className="mt-0.5 size-3.5 rounded accent-amber-400 cursor-pointer shrink-0"
              />
              <span>
                I understand that BandMate&apos;s harmonic analysis, voice-leading, and chord suggestions are creative studio aids.
              </span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-1 font-mono text-[10px]">
              <Link href="/privacy" onClick={closeAuthModal} className="text-amber-400 hover:underline">
                Privacy Policy
              </Link>
              <span className="text-zinc-600">·</span>
              <Link href="/terms" onClick={closeAuthModal} className="text-amber-400 hover:underline">
                Terms of Service
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canProceed}
            className="w-full h-10 bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 cursor-pointer gap-2 mt-4"
          >
            <span>{mode === "login" ? "Sign In to Studio" : "Create My Account"}</span>
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
