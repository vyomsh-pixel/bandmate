"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Eye, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { pcToName } from "@/lib/music/notes"
import type { ParsedChord } from "@/lib/music/types"
import { generateGuitarVoicings } from "@/lib/music/guitar-voicings"

interface GuitarFretboardProps {
  chord: ParsedChord | null
  frets?: number
  capoFret?: number
  concertSymbol?: string
}

export const GUITAR_TUNINGS = [
  { id: "standard", name: "Standard (EADGBE)", strings: [{ note: "e", midi: 64 }, { note: "B", midi: 59 }, { note: "G", midi: 55 }, { note: "D", midi: 50 }, { note: "A", midi: 45 }, { note: "E", midi: 40 }] },
  { id: "drop_d", name: "Drop D (DADGBE)", strings: [{ note: "e", midi: 64 }, { note: "B", midi: 59 }, { note: "G", midi: 55 }, { note: "D", midi: 50 }, { note: "A", midi: 45 }, { note: "D", midi: 38 }] },
  { id: "dadgad", name: "DADGAD", strings: [{ note: "d", midi: 62 }, { note: "A", midi: 57 }, { note: "G", midi: 55 }, { note: "D", midi: 50 }, { note: "A", midi: 45 }, { note: "D", midi: 38 }] },
  { id: "half_step", name: "Half-Step Down (Eb)", strings: [{ note: "eb", midi: 63 }, { note: "Bb", midi: 58 }, { note: "Gb", midi: 54 }, { note: "Db", midi: 49 }, { note: "Ab", midi: 44 }, { note: "Eb", midi: 39 }] },
  { id: "open_d", name: "Open D (DADF#AD)", strings: [{ note: "d", midi: 62 }, { note: "A", midi: 57 }, { note: "F#", midi: 54 }, { note: "D", midi: 50 }, { note: "A", midi: 45 }, { note: "D", midi: 38 }] },
]

export function GuitarFretboard({ chord, frets = 15, capoFret: initialCapo = 0, concertSymbol }: GuitarFretboardProps) {
  const [tuningId, setTuningId] = useState("standard")
  const [capoFret, setCapoFret] = useState(initialCapo)

  const currentTuning = GUITAR_TUNINGS.find((t) => t.id === tuningId) ?? GUITAR_TUNINGS[0]
  const strings = currentTuning.strings

  const voicings = useMemo(() => {
    if (!chord || !chord.valid) return []
    return generateGuitarVoicings(chord)
  }, [chord])

  const [shapeIndex, setShapeIndex] = useState(0)
  // "compact" fits 100% on phone screen with zero scrollbar; "neck" shows the extended 15-fret neck
  const [viewMode, setViewMode] = useState<"compact" | "neck">("compact")

  // Ensure we don't go out of bounds if chord changes
  const activeVoicing = voicings[Math.min(shapeIndex, voicings.length - 1)]

  if (!chord || !chord.valid) {
    return <div className="text-muted-foreground text-sm py-8 text-center">Select a valid chord to see shapes.</div>
  }

  if (!activeVoicing) {
    return <div className="text-muted-foreground text-sm py-8 text-center">No shapes available for this chord.</div>
  }

  const baseFret = activeVoicing.baseFret
  const isCompact = viewMode === "compact"

  // In compact mode: 4-fret window centered on the chord position (fits phone screens 100%)
  const startFret = isCompact ? (baseFret > 1 ? baseFret : 1) : 1
  const renderFretsCount = isCompact ? 4 : Math.max(12, baseFret + 4)

  return (
    <div className="flex flex-col gap-3">
      {/* Top Header: Voicing Label, Position Badge, Tuning Selector & Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-foreground font-bold">
            {activeVoicing.label}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-400/15 text-amber-400 border border-amber-400/30">
            {capoFret > 0
              ? `Capo ${capoFret}: Play ${chord.symbol} shape`
              : baseFret > 1
                ? `Fret ${baseFret} (Barre)`
                : "Nut (Open Chord)"}
          </span>

          {/* Tuning Preset Selector */}
          <select
            value={tuningId}
            onChange={(e) => setTuningId(e.target.value)}
            className="h-7 rounded-md border border-border bg-background/80 px-2 font-mono text-[10px] font-bold text-amber-300 cursor-pointer outline-hidden"
            aria-label="Guitar Tuning"
          >
            {GUITAR_TUNINGS.map((t) => (
              <option key={t.id} value={t.id} className="bg-popover text-foreground">
                {t.name}
              </option>
            ))}
          </select>

          {/* Capo Stepper */}
          <div className="flex items-center rounded-md border border-border bg-background/80 px-1.5 h-7">
            <span className="font-mono text-[10px] font-bold text-muted-foreground mr-1">CAPO</span>
            <button
              type="button"
              onClick={() => setCapoFret((c) => Math.max(0, c - 1))}
              className="px-1 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              -
            </button>
            <span className="font-mono text-[10px] font-black text-amber-400 px-1 min-w-[14px] text-center">
              {capoFret}
            </span>
            <button
              type="button"
              onClick={() => setCapoFret((c) => Math.min(12, c + 1))}
              className="px-1 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Compact (Zero-scroll) vs Full Neck */}
          <button
            type="button"
            onClick={() => setViewMode(v => v === "compact" ? "neck" : "compact")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border/80 bg-background/60 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
            title={isCompact ? "Switch to 15-fret full neck" : "Switch to compact 4-fret chord box"}
          >
            {isCompact ? <Layers className="size-3 text-emerald-400" /> : <Eye className="size-3 text-amber-400" />}
            <span>{isCompact ? "Compact Box" : "Full Neck"}</span>
          </button>

          {/* Shape Selector */}
          {voicings.length > 1 && (
            <div className="flex items-center gap-1 bg-background/60 rounded-lg p-0.5 border border-border/80">
              <button
                onClick={() => setShapeIndex(i => Math.max(0, i - 1))}
                disabled={shapeIndex === 0}
                className="size-6 flex items-center justify-center hover:bg-muted rounded disabled:opacity-30 cursor-pointer"
                aria-label="Previous shape"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-zinc-300 px-1">
                {Math.min(shapeIndex + 1, voicings.length)} / {voicings.length}
              </span>
              <button
                onClick={() => setShapeIndex(i => Math.min(voicings.length - 1, i + 1))}
                disabled={shapeIndex >= voicings.length - 1}
                className="size-6 flex items-center justify-center hover:bg-muted rounded disabled:opacity-30 cursor-pointer"
                aria-label="Next shape"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fretboard Canvas */}
      <div className={cn("relative w-full pb-2", !isCompact && "overflow-x-auto")}>
        <div className={cn(
          "flex flex-col gap-[2px] bg-zinc-800 p-[2px] rounded-lg select-none border border-zinc-700 shadow-md relative",
          isCompact ? "w-full min-w-0" : "min-w-[620px]",
        )}>
          {/* 6 Guitar Strings */}
          {strings.map((string, stringIdx) => {
            const fretValue = activeVoicing.frets[5 - stringIdx] // 0 is low E in generator, reverse
            const isOpen = fretValue === 0
            const isMuted = fretValue === "X"

            return (
              <div key={stringIdx} className="flex h-7 sm:h-8 bg-zinc-950">
                {/* Nut / Starting Position Indicator */}
                <div className="w-10 sm:w-12 shrink-0 flex items-center justify-center border-r-4 border-r-zinc-600 font-mono text-xs font-bold text-zinc-300 bg-zinc-900/60 relative">
                  {isMuted && <span className="absolute left-1.5 text-rose-400 font-bold text-xs">✕</span>}
                  {isOpen && <span className="absolute left-1.5 text-emerald-400 font-bold text-xs">○</span>}
                  <span>{string.note}</span>
                </div>

                {/* Frets in this row */}
                {Array.from({ length: renderFretsCount }).map((_, fretOffset) => {
                  const absoluteFret = startFret + fretOffset
                  const isActive = fretValue === absoluteFret
                  const isRoot = isActive && (string.midi + absoluteFret) % 12 === chord.rootPc

                  return (
                    <div
                      key={fretOffset}
                      className={cn(
                        "flex-1 border-r border-r-zinc-700 flex items-center justify-center relative min-w-0",
                        "before:absolute before:left-0 before:right-0 before:h-[2px] before:bg-zinc-600/70 before:top-1/2 before:-translate-y-1/2",
                      )}
                    >
                      {/* Standard Guitar Position Inlays (Dots on 3, 5, 7, 9, 12) */}
                      {!isCompact && (
                        <>
                          {stringIdx === 2 && [3, 5, 7, 9, 15].includes(absoluteFret) && (
                            <div className="absolute top-[150%] size-2.5 rounded-full bg-zinc-500/40 -translate-y-1/2 pointer-events-none" />
                          )}
                          {stringIdx === 1 && absoluteFret === 12 && (
                            <div className="absolute top-[250%] size-2 rounded-full bg-zinc-500/50 -translate-y-1/2 pointer-events-none" />
                          )}
                          {stringIdx === 4 && absoluteFret === 12 && (
                            <div className="absolute top-[50%] size-2 rounded-full bg-zinc-500/50 -translate-y-1/2 pointer-events-none" />
                          )}
                        </>
                      )}

                      {/* Note Finger Marker */}
                      {isActive && (
                        <div
                          className={cn(
                            "relative z-10 flex size-5 sm:size-5.5 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black shadow-md transition-all scale-105",
                            isRoot
                              ? "bg-amber-400 text-black shadow-amber-400/40 ring-1 ring-amber-300"
                              : "bg-emerald-500 text-black shadow-emerald-500/30 ring-1 ring-emerald-400",
                          )}
                        >
                          {pcToName((string.midi + absoluteFret) % 12, "sharp")}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Fret Numbers Track (Crucial for Guitarists) */}
          <div className="flex bg-zinc-900/90 h-6 border-t border-zinc-700">
            <div className="w-10 sm:w-12 shrink-0 flex items-center justify-center font-mono text-[9px] sm:text-[10px] font-bold text-zinc-400 border-r-4 border-r-zinc-600">
              {startFret === 1 ? "Nut" : `fr.${startFret}`}
            </div>
            {Array.from({ length: renderFretsCount }).map((_, fretOffset) => {
              const absoluteFret = startFret + fretOffset
              const isBase = baseFret === absoluteFret
              const isDotFret = [3, 5, 7, 9, 12, 15].includes(absoluteFret)

              return (
                <div
                  key={fretOffset}
                  className={cn(
                    "flex-1 flex items-center justify-center font-mono text-[10px] sm:text-[11px] border-r border-zinc-800 min-w-0",
                    isBase
                      ? "text-amber-400 font-black bg-amber-400/10"
                      : isDotFret
                        ? "text-zinc-200 font-extrabold"
                        : "text-zinc-500 font-medium",
                  )}
                >
                  <span>{absoluteFret}</span>
                  {absoluteFret === 12 && <span className="text-[7px] text-amber-400 ml-0.5 font-bold">••</span>}
                  {isDotFret && absoluteFret !== 12 && <span className="text-[7px] text-zinc-400 ml-0.5">•</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
