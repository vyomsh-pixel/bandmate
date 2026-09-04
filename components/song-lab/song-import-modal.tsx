"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Sparkles, Check, ArrowRight, Wand2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { parseSongFromDescription, type ParsedSongResult } from "@/lib/music/song-parser"
import { cn } from "@/lib/utils"

const EXAMPLE_PROMPTS = [
  {
    label: "Fly Me To The Moon",
    subtitle: "Jazz Standard — Circle of 5ths 7th Chords",
    text: `"Fly Me To The Moon" — Frank Sinatra
Genre: Jazz Standard
Best to test: Circle of 5ths jazz progression, complex 7th chords (Am7, Dm7, G7, Cmaj7, Fmaj7, Bm7b5, E7), and Smooth Voice-Leading / Inversion Optimization.
Key: C Major / A Minor | BPM: 120 | Time Signature: 4/4
Section Breakdown
Main Section (8 Bars):
Am7 (4 beats) → Dm7 (4 beats) → G7 (4 beats) → Cmaj7 (4 beats)
Fmaj7 (4 beats) → Bm7b5 (4 beats) → E7 (4 beats) → Am7 (4 beats)`,
  },
  {
    label: "Autumn Leaves",
    subtitle: "2-5-1 Jazz Progression in G Major",
    text: `"Autumn Leaves" — Joseph Kosma
Genre: Jazz Standard
Key: G Major | BPM: 110 | Time Signature: 4/4
Section Breakdown
A Section (8 Bars):
Am7 (4 beats) → D7 (4 beats) → Gmaj7 (4 beats) → Cmaj7 (4 beats)
F#m7b5 (4 beats) → B7 (4 beats) → Em7 (4 beats) → Em7 (4 beats)`,
  },
  {
    label: "Pop Anthem",
    subtitle: "I - V - vi - IV Modern Pop",
    text: `"Summer Anthem" — Pop Hits
Genre: Pop / Synthpop
Key: C Major | BPM: 128 | Time Signature: 4/4
Chorus:
C (4 beats) → G (4 beats) → Am (4 beats) → F (4 beats)`,
  },
]

interface SongImportModalProps {
  onImport: (songData: ParsedSongResult) => void
  triggerClassName?: string
}

export function SongImportModal({ onImport, triggerClassName }: SongImportModalProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [inputText, setInputText] = useState(EXAMPLE_PROMPTS[0].text)

  useEffect(() => {
    setMounted(true)
  }, [])

  const parsed = parseSongFromDescription(inputText)

  const handleApply = () => {
    onImport(parsed)
    setOpen(false)
  }

  const modalContent = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl border border-zinc-800 bg-zinc-950/95 p-6 z-50 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Wand2 className="size-4.5" />
            </div>
            <div>
              <h3 className="font-mono text-base font-black tracking-tight text-white">
                Instant AI Song Prompt Setup
              </h3>
              <p className="text-xs text-zinc-400">
                Paste any song description, lead sheet notation, or AI prompt to auto-configure Song Lab.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Quick Example Presets */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Preset Song Prompts
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setInputText(ex.text)}
                className={cn(
                  "flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer",
                  inputText === ex.text
                    ? "border-amber-400 bg-amber-400/10 text-amber-300 font-bold shadow-xs"
                    : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300",
                )}
              >
                <span className="font-mono text-xs font-black truncate text-white">{ex.label}</span>
                <span className="text-[10px] text-zinc-400 line-clamp-1">{ex.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Area Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="song-prompt" className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Song Prompt / Lead Sheet Description
            </label>
            <button
              type="button"
              onClick={() => setInputText("")}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Clear
            </button>
          </div>
          <textarea
            id="song-prompt"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 font-mono text-xs font-medium text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/80 focus:outline-hidden focus:ring-1 focus:ring-amber-400/30 transition-all no-scrollbar"
            placeholder="Paste song details e.g. Key: C Major | BPM: 120 | Chords: Am7 -> Dm7 -> G7 -> Cmaj7..."
          />
        </div>

        {/* Live Parsed Preview Box */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Check className="size-3 text-emerald-400" />
              <span>Parsed Song Preview</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 font-bold">
              {parsed.sections.reduce((acc, s) => acc + s.chords.length, 0)} Chords Extracted
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[9px] text-zinc-400 block uppercase">Title</span>
              <span className="font-bold text-white truncate block">{parsed.title}</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[9px] text-zinc-400 block uppercase">Key Signature</span>
              <span className="font-bold text-amber-400 block">
                {parsed.keyTonic} {parsed.keyMode}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[9px] text-zinc-400 block uppercase">Tempo & Meter</span>
              <span className="font-bold text-white block">
                {parsed.bpm} BPM ({parsed.beatsPerBar}/4)
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[9px] text-zinc-400 block uppercase">Sections</span>
              <span className="font-bold text-white block">{parsed.sections.length} Section(s)</span>
            </div>
          </div>

          {/* Section Chords Summary */}
          <div className="max-h-24 overflow-y-auto space-y-1 text-xs font-mono">
            {parsed.sections.map((sec) => (
              <div key={sec.name} className="flex items-center gap-2 p-1.5 rounded bg-zinc-900/80 border border-zinc-800/80">
                <span className="font-bold text-amber-300 text-[11px] min-w-[80px] shrink-0">{sec.name}:</span>
                <div className="flex flex-wrap gap-1">
                  {sec.chords.map((c, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold text-[10px]">
                      {c.symbol} ({c.beats}b)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-9 px-4 text-xs font-bold border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={parsed.sections.every((s) => s.chords.length === 0)}
            className="h-9 px-5 gap-2 rounded-xl bg-amber-400 text-zinc-950 font-mono text-xs font-black hover:bg-amber-300 shadow-lg cursor-pointer"
          >
            <span>Set Up Song Lab</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "gap-1.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-amber-600/20 font-mono text-xs font-black text-amber-300 hover:from-amber-500/30 hover:to-amber-600/30 hover:border-amber-400 shadow-md transition-all cursor-pointer shrink-0",
          triggerClassName,
        )}
        title="Paste any song description or prompt to set up Song Lab automatically"
      >
        <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
        <span>AI Prompt / Import</span>
      </Button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}

