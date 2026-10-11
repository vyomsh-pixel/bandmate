"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ShieldCheck, FileText, X, Database, Cpu, Sparkles, ArrowLeft } from "lucide-react"

export type LegalDocType = "privacy" | "terms"

interface LegalDocViewProps {
  type: LegalDocType
  isModal?: boolean
  onClose?: () => void
  onSwitchType?: (type: LegalDocType) => void
}

export function LegalDocContent({ type, isModal = false, onClose, onSwitchType }: LegalDocViewProps) {
  const isPrivacy = type === "privacy"

  return (
    <div className="space-y-4 text-zinc-300 text-xs leading-relaxed">
      {/* Explicit Legal Placeholder Notice */}
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3.5 text-amber-200">
        <div className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-400 mb-1">
          TODO(LEGAL): Supply official organization legal copy
        </div>
        <p className="text-[11px] text-amber-200/90">
          This section is a technical studio architecture summary placeholder pending review and final copy from legal counsel.
        </p>
      </div>

      {isPrivacy ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
              <Database className="size-4 text-amber-400 shrink-0" />
              <span>1. Browser Local Storage & Account Vault</span>
            </div>
            <p className="text-zinc-400">
              BandMate stores your chord progressions, song arrangements, key signatures, and consent timestamp in browser{" "}
              <code className="text-amber-300 font-mono">localStorage</code> under per-user namespaced keys (
              <code className="text-zinc-300 font-mono">bandmate:songs:&lt;uid&gt;:v1</code>). Local fallback credentials are salted and hashed with SHA-256.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
              <Cpu className="size-4 text-emerald-400 shrink-0" />
              <span>2. IndexedDB Acoustic Soundfont Sample Cache</span>
            </div>
            <p className="text-zinc-400">
              To enable low-latency studio playback without repeated network downloads, BandMate caches acoustic instrument soundfont audio buffers in your browser&apos;s{" "}
              <code className="text-emerald-300 font-mono">IndexedDB</code> (<code className="text-zinc-300 font-mono">bandmate_soundfont_cache_v1</code>).
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
              <ShieldCheck className="size-4 text-cyan-400 shrink-0" />
              <span>3. Data Portability & Right to Erasure</span>
            </div>
            <p className="text-zinc-400">
              You can export all of your studio songs, profile metadata, and consent records at any time via{" "}
              <strong className="text-zinc-200">Export Studio Data (JSON)</strong>, or permanently wipe all local songs, account records, and cached soundfont samples via{" "}
              <strong className="text-rose-300">Delete Account &amp; Clear Soundfont Cache</strong> in the top-right Studio Account menu.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
              <Sparkles className="size-4 text-amber-400 shrink-0" />
              <span>1. Creative Studio Aid Disclaimer</span>
            </div>
            <p className="text-zinc-400">
              BandMate&apos;s harmonic function analysis, voice-leading inversion optimizer, capo recommendations, solo coach notes, and chord progression suggestions are algorithmic creative studio aids for songwriting, practice, and arrangement.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
              <FileText className="size-4 text-emerald-400 shrink-0" />
              <span>2. User-Created Progressions & Lead Sheets</span>
            </div>
            <p className="text-zinc-400">
              You retain full ownership of the original songs, MIDI files (<code className="text-zinc-300 font-mono">.mid</code>), and lead sheets (<code className="text-zinc-300 font-mono">.txt</code>) you compose and export using BandMate Song Lab.
            </p>
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-[11px] font-mono">
        <div className="flex items-center gap-3">
          {onSwitchType ? (
            <button
              type="button"
              onClick={() => onSwitchType(isPrivacy ? "terms" : "privacy")}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer font-bold"
            >
              View {isPrivacy ? "Terms of Service" : "Privacy Policy"}
            </button>
          ) : (
            <Link
              href={isPrivacy ? "/terms" : "/privacy"}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-4 font-bold"
            >
              View {isPrivacy ? "Terms of Service" : "Privacy Policy"}
            </Link>
          )}
        </div>

        {isModal && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-black font-black uppercase tracking-wider hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Done
          </button>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 text-black font-black uppercase tracking-wider hover:bg-amber-300 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to BandMate Studio</span>
          </Link>
        )}
      </div>
    </div>
  )
}

export function LegalModal({
  openType,
  onClose,
  onSwitchType,
}: {
  openType: LegalDocType | null
  onClose: () => void
  onSwitchType: (type: LegalDocType) => void
}) {
  useEffect(() => {
    if (!openType) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [openType, onClose])

  if (!openType) return null

  const isPrivacy = openType === "privacy"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              {isPrivacy ? <ShieldCheck className="size-4.5" /> : <FileText className="size-4.5" />}
            </div>
            <div>
              <h2 id="legal-modal-title" className="font-mono text-base font-black tracking-tight text-white">
                {isPrivacy ? "BandMate Privacy & Data Policy" : "BandMate Terms of Service"}
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                Studio Data Governance &amp; Disclaimers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal dialog"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <LegalDocContent
          type={openType}
          isModal
          onClose={onClose}
          onSwitchType={onSwitchType}
        />
      </div>
    </div>
  )
}
