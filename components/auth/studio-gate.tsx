"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"
import { LegalModal, type LegalDocType } from "./legal-modals"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Headphones,
  CheckCircle2,
} from "lucide-react"

const CONSENT_STORAGE_KEY = "bandmate:privacy:consent:v1"
const STUDIO_LOCKED_KEY = "bandmate:studio:locked:v1"
const USER_STORAGE_KEY = "bandmate:auth:user:v1"

/**
 * Lock the studio session and return the user to the Pre-Entry Studio Gate.
 */
export function lockStudioSession(): void {
  if (typeof window === "undefined") return
  try {
    getAudioEngine().stop()
  } catch {}
  try {
    window.localStorage.setItem(STUDIO_LOCKED_KEY, "true")
    window.localStorage.removeItem(CONSENT_STORAGE_KEY)
    window.dispatchEvent(new Event("bandmate:studio-lock"))
  } catch {}
}

/**
 * Persist studio consent timestamps in localStorage for the active user/guest.
 */
export function recordStudioConsent(uid = "guest-user"): number {
  const now = Date.now()
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, String(now))
      window.localStorage.setItem(`bandmate:consent:${uid}:v1`, String(now))
      window.localStorage.removeItem(STUDIO_LOCKED_KEY)

      const rawUser = window.localStorage.getItem(USER_STORAGE_KEY)
      if (rawUser) {
        const parsed = JSON.parse(rawUser)
        if (parsed && typeof parsed === "object") {
          parsed.consentAcceptedAt = parsed.consentAcceptedAt ?? now
          window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsed))
        }
      }
    } catch {}
  }
  return now
}

/**
 * Pure CSS + Inline SVG BandMate Studio Harmonic Waveform & 88-Key Frequency Sweep Loading Screen (<5KB).
 * Uses only GPU-composited `transform` and `opacity` and respects `prefers-reduced-motion`.
 * Unmounts completely once transition finishes so 0% idle CPU/GPU is consumed.
 */
function StudioHarmonicLoadingScreen({ progressStep }: { progressStep: number }) {
  const statusLabels = [
    "Calibrating 440Hz Reference Pitch & Harmonic Matrix…",
    "Mounting IndexedDB Soundfont Vault & Local Studio Store…",
    "Engaging 88-Key Voice-Leading Engine & Guitar Fretboard…",
  ]
  const activeLabel = statusLabels[Math.min(progressStep, statusLabels.length - 1)]
  const scaleProgress = progressStep === 0 ? 0.34 : progressStep === 1 ? 0.72 : 1

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Initializing BandMate Studio"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 select-none overflow-hidden"
    >
      <style>{`
        @keyframes bm-wave-pulse {
          0%, 100% { transform: scaleY(0.55); opacity: 0.65; }
          50% { transform: scaleY(1.12); opacity: 1; }
        }
        @keyframes bm-key-sweep {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.35; }
          50% { transform: translateY(-3px) scaleY(1.06); opacity: 1; }
        }
        .bm-wave-a {
          transform-origin: center;
          animation: bm-wave-pulse 0.85s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .bm-wave-b {
          transform-origin: center;
          animation: bm-wave-pulse 0.85s ease-in-out 0.22s infinite;
          will-change: transform, opacity;
        }
        .bm-key-anim {
          transform-origin: top center;
          animation: bm-key-sweep 0.75s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .bm-wave-a, .bm-wave-b, .bm-key-anim {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-md space-y-5">
        {/* Studio Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-md shadow-amber-500/20">
              <TrebleClefIcon className="size-5 fill-current" />
            </div>
            <div>
              <div className="font-mono text-sm font-black tracking-tight text-white uppercase">
                BandMate Studio Engine
              </div>
              <div className="font-mono text-[10px] font-bold text-amber-400">
                48kHz / 24-Bit WebAudio Synthesis
              </div>
            </div>
          </div>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[10px] font-black text-emerald-400 uppercase">
            {Math.round(scaleProgress * 100)}%
          </span>
        </div>

        {/* Crisp Vector SVG Harmonic Waveform + 88-Key Frequency Sweep */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4 space-y-3">
          {/* Harmonic Overtone Oscilloscope SVG */}
          <svg
            viewBox="0 0 360 76"
            className="w-full h-16 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bmHarmonicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="35%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="70%" stopColor="#34d399" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            {/* Center 0dB Reference Axis */}
            <line x1="0" y1="38" x2="360" y2="38" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
            {/* Secondary Overtone Wave */}
            <path
              className="bm-wave-b"
              d="M 0 38 Q 30 8, 60 38 T 120 38 T 180 38 T 240 38 T 300 38 T 360 38"
              fill="none"
              stroke="#34d399"
              strokeWidth="1.75"
              strokeOpacity="0.55"
            />
            {/* Primary Fundamental Harmonic Wave */}
            <path
              className="bm-wave-a"
              d="M 0 38 Q 45 4, 90 38 T 180 38 T 270 38 T 360 38"
              fill="none"
              stroke="url(#bmHarmonicGrad)"
              strokeWidth="2.75"
              strokeLinecap="round"
            />
          </svg>

          {/* 88-Key Frequency Sweep Vector Strip */}
          <svg
            viewBox="0 0 352 28"
            className="w-full h-7"
            aria-hidden="true"
          >
            {Array.from({ length: 22 }).map((_, idx) => {
              const isHighlighted = idx % 3 === 0 || idx === 7 || idx === 11 || idx === 14
              const fill =
                idx === 7 || idx === 14
                  ? "#fbbf24"
                  : idx === 11
                    ? "#34d399"
                    : isHighlighted
                      ? "#38bdf8"
                      : "#3f3f46"
              return (
                <rect
                  key={idx}
                  x={idx * 16 + 1}
                  y="2"
                  width="13"
                  height="24"
                  rx="2.5"
                  fill={fill}
                  className={isHighlighted ? "bm-key-anim" : undefined}
                  style={isHighlighted ? { animationDelay: `${(idx % 6) * 90}ms` } : undefined}
                />
              )
            })}
          </svg>
        </div>

        {/* VU Meter Progress Bar (transform: scaleX) */}
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden p-0.5">
            <div
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${scaleProgress})` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
            <span className="truncate">{activeLabel}</span>
            <span className="text-amber-400 font-bold shrink-0 ml-2">READY</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StudioGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, login, signup, loginWithGoogle } = useAuth()

  const [hydrated, setHydrated] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [progressStep, setProgressStep] = useState(0)

  // Consent checkboxes state
  const [consentStorage, setConsentStorage] = useState(false)
  const [consentCreativeAid, setConsentCreativeAid] = useState(false)

  // Auth form state inside Gate
  const [authTab, setAuthTab] = useState<"guest" | "login" | "signup">("guest")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Legal modal state ("privacy" | "terms" | null)
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null)

  const bothConsentsChecked = consentStorage && consentCreativeAid

  // Check persisted consent and lock status on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const hasConsent = Boolean(window.localStorage.getItem(CONSENT_STORAGE_KEY))
      const isLocked = window.localStorage.getItem(STUDIO_LOCKED_KEY) === "true"
      if (hasConsent && !isLocked) {
        setConsentStorage(true)
        setConsentCreativeAid(true)
        setIsUnlocked(true)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Listen for studio lock events triggered from UserProfileButton or Workspace footer
  useEffect(() => {
    const handleLock = () => {
      setIsUnlocked(false)
      setIsTransitioning(false)
      setConsentStorage(false)
      setConsentCreativeAid(false)
    }
    window.addEventListener("bandmate:studio-lock", handleLock)
    return () => window.removeEventListener("bandmate:studio-lock", handleLock)
  }, [])

  const triggerStudioEntryTransition = useCallback((uid?: string) => {
    recordStudioConsent(uid ?? user?.uid ?? "guest-user")
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setIsUnlocked(true)
      return
    }

    setProgressStep(0)
    setIsTransitioning(true)

    const t1 = window.setTimeout(() => setProgressStep(1), 340)
    const t2 = window.setTimeout(() => setProgressStep(2), 700)
    const t3 = window.setTimeout(() => {
      setIsTransitioning(false)
      setIsUnlocked(true)
    }, 1060)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [user?.uid])

  const handleGuestEntry = () => {
    if (!bothConsentsChecked) return
    triggerStudioEntryTransition("guest-user")
  }

  const handleGoogleEntry = async () => {
    if (!bothConsentsChecked) return
    setIsSubmitting(true)
    try {
      const ok = await loginWithGoogle()
      if (ok) {
        triggerStudioEntryTransition()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bothConsentsChecked) return
    setIsSubmitting(true)
    try {
      const ok =
        authTab === "login"
          ? await login(email, password)
          : await signup(email, password, name)
      if (ok) {
        triggerStudioEntryTransition()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hydrated || isLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-400">
        Initializing BandMate Studio…
      </div>
    )
  }

  if (isTransitioning) {
    return <StudioHarmonicLoadingScreen progressStep={progressStep} />
  }

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="min-h-dvh w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="w-full max-w-xl rounded-3xl border border-zinc-800/90 bg-zinc-900/50 p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Brand Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <TrebleClefIcon className="size-7 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-xl sm:text-2xl font-black tracking-tight text-white">
                    BandMate
                  </h1>
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-amber-300">
                    Song Lab Studio
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Interactive harmonic workstation, 88-key voice leading &amp; 36-quality guitar fretboard
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Explicit Pre-Use Consent & Studio Disclaimers */}
          <div className="rounded-2xl border border-amber-400/30 bg-zinc-950/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-amber-400" />
                <span>Step 1 · Studio Storage &amp; Creative Aid Authorization</span>
              </span>
              {bothConsentsChecked && (
                <span className="font-mono text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  Authorized
                </span>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={consentStorage}
                onChange={(e) => setConsentStorage(e.target.checked)}
                className="mt-0.5 size-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 accent-amber-400 cursor-pointer shrink-0"
              />
              <span className="text-xs text-zinc-200 leading-relaxed group-hover:text-white transition-colors">
                I consent to BandMate caching studio soundfont samples in browser IndexedDB and storing my chord progressions in local/account storage.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={consentCreativeAid}
                onChange={(e) => setConsentCreativeAid(e.target.checked)}
                className="mt-0.5 size-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 accent-amber-400 cursor-pointer shrink-0"
              />
              <span className="text-xs text-zinc-200 leading-relaxed group-hover:text-white transition-colors">
                I understand that BandMate&apos;s harmonic analysis, voice-leading, and chord suggestions are creative studio aids.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-400">
              <span>Review studio governance docs:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLegalDoc("privacy")}
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer font-bold"
                >
                  Privacy Policy
                </button>
                <span className="text-zinc-700">·</span>
                <button
                  type="button"
                  onClick={() => setLegalDoc("terms")}
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer font-bold"
                >
                  Terms of Service
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Choose Studio Entry Mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Headphones className="size-4 text-amber-400" />
                <span>Step 2 · Authenticate or Enter as Guest Producer</span>
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 rounded-xl bg-zinc-950 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setAuthTab("guest")}
                className={`py-2 rounded-lg text-xs font-mono font-extrabold uppercase transition-all cursor-pointer ${
                  authTab === "guest"
                    ? "bg-amber-400 text-black shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Guest Producer
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`py-2 rounded-lg text-xs font-mono font-extrabold uppercase transition-all cursor-pointer ${
                  authTab === "login"
                    ? "bg-amber-400 text-black shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("signup")}
                className={`py-2 rounded-lg text-xs font-mono font-extrabold uppercase transition-all cursor-pointer ${
                  authTab === "signup"
                    ? "bg-amber-400 text-black shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {authTab === "guest" ? (
              <div className="space-y-3 pt-1">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 text-xs text-zinc-300 space-y-1.5">
                  <div className="font-mono font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>Instant Local Studio Vault</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Launch directly into Song Lab and Guitar Workspace. Your progressions are saved in your browser&apos;s local vault and automatically migrate if you sign in later.
                  </p>
                </div>

                <Button
                  type="button"
                  disabled={!bothConsentsChecked}
                  onClick={handleGuestEntry}
                  className="w-full h-11 bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 cursor-pointer gap-2"
                >
                  <span>Continue as Guest Producer</span>
                  <ArrowRight className="size-4" />
                </Button>

                <Button
                  type="button"
                  disabled={!bothConsentsChecked || isSubmitting}
                  onClick={handleGoogleEntry}
                  variant="outline"
                  className="w-full h-10 bg-white text-black hover:bg-zinc-100 disabled:opacity-40 font-mono font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer gap-2.5 border border-zinc-200"
                >
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
                  <span>Continue with Google</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
                {authTab === "signup" && (
                  <div className="space-y-1">
                    <label
                      htmlFor="gate-artist-name"
                      className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400"
                    >
                      Display Name / Artist Handle
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 size-4 text-zinc-500" />
                      <Input
                        id="gate-artist-name"
                        type="text"
                        placeholder="e.g. Jimi Hendrix"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 bg-zinc-950/90 border-zinc-800 text-xs font-bold text-white focus:border-amber-400 h-10 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="gate-email"
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-zinc-500" />
                    <Input
                      id="gate-email"
                      type="email"
                      placeholder="musician@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-zinc-950/90 border-zinc-800 text-xs font-bold text-white focus:border-amber-400 h-10 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="gate-password"
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-zinc-500" />
                    <Input
                      id="gate-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 bg-zinc-950/90 border-zinc-800 text-xs font-bold text-white focus:border-amber-400 h-10 rounded-xl"
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

                <Button
                  type="submit"
                  disabled={!bothConsentsChecked || isSubmitting}
                  className="w-full h-11 bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 cursor-pointer gap-2"
                >
                  <span>
                    {authTab === "login" ? "Sign In & Launch Studio" : "Create Account & Launch Studio"}
                  </span>
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            )}

            {!bothConsentsChecked && (
              <p className="text-[11px] font-mono text-amber-300/90 text-center">
                Please check both Step 1 authorization boxes above to unlock studio entry.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Pre-Entry Footer with Direct Route Links */}
      <footer className="text-center font-mono text-[11px] text-zinc-500 py-2 flex flex-wrap items-center justify-center gap-3">
        <span>BandMate Song Lab · Local Studio Vault &amp; IndexedDB Audio Cache</span>
        <span>·</span>
        <Link href="/privacy" className="text-zinc-400 hover:text-amber-400 underline underline-offset-4">
          /privacy
        </Link>
        <span>·</span>
        <Link href="/terms" className="text-zinc-400 hover:text-amber-400 underline underline-offset-4">
          /terms
        </Link>
      </footer>

      <LegalModal
        openType={legalDoc}
        onClose={() => setLegalDoc(null)}
        onSwitchType={(next) => setLegalDoc(next)}
      />
    </div>
  )
}
