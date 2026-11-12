"use client"

import { useEffect } from "react"
import { Keyboard, X } from "lucide-react"

interface ShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUT_GROUPS = [
  {
    category: "Transport & Playback",
    shortcuts: [
      { key: "Space", desc: "Start / Stop audio playback" },
      { key: "L", desc: "Toggle loop playback" },
      { key: "M", desc: "Toggle metronome click" },
      { key: "T", desc: "Tap tempo rhythmically" },
    ],
  },
  {
    category: "Chord Navigation & Editing",
    shortcuts: [
      { key: "← / →", desc: "Select previous / next chord" },
      { key: "D / R", desc: "Duplicate / repeat active chord" },
      { key: "Backspace / Del", desc: "Delete active chord" },
      { key: "0 – 3", desc: "Switch chord inversion (Root, 1st, 2nd, 3rd)" },
    ],
  },
  {
    category: "Studio Layout & Panels",
    shortcuts: [
      { key: "P", desc: "Toggle 88-Key Piano / Instrument visualizer" },
      { key: "I", desc: "Toggle Chord Voice Inspector dock" },
      { key: "Z / ⌘Z", desc: "Undo last edit" },
      { key: "Y / ⌘⇧Z", desc: "Redo last edit" },
      { key: "?", desc: "Open this keyboard shortcuts guide" },
      { key: "Esc", desc: "Close open dialogs & deselect" },
    ],
  },
]

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-xs">
              <Keyboard className="size-4" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="font-mono text-sm font-bold text-foreground">
                Studio Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                Speed up your songwriting and harmonic workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 py-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/90">
                {group.category}
              </h4>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 divide-y divide-zinc-800/60 overflow-hidden">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-800/30 transition-colors"
                  >
                    <span className="text-zinc-300 font-medium">{s.desc}</span>
                    <kbd className="font-mono text-[10px] font-bold text-amber-300 bg-zinc-800/90 border border-zinc-700/60 px-2 py-0.5 rounded shadow-xs shrink-0 ml-2">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Press <kbd className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">Esc</kbd> or <kbd className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">?</kbd> to toggle</span>
          <span className="text-amber-400 font-bold">BandMate Studio</span>
        </div>
      </div>
    </div>
  )
}
