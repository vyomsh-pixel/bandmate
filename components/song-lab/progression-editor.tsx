"use client"

/**
 * BandMate — Progression editor.
 *
 * Editable list of chord slots plus a diatonic quick-add palette. Each slot
 * shows a live-validated chord symbol, its beat length, and controls to
 * reorder / remove. Clicking a slot selects it for inspection + playback.
 */

import { useEffect, useMemo, useRef } from "react"
import { Plus, X, ChevronLeft, ChevronRight, Minus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseChord } from "@/lib/music/chord-parser"
import { diatonicChords, makeKey } from "@/lib/music/scales"
import { getHarmonicFunction } from "@/lib/music/analysis"
import type { ChordEntry, Section } from "@/lib/music/types"

interface ProgressionEditorProps {
  sections: Section[]
  keyTonic: string
  keyMode: "major" | "minor"
  selectedId: string | null
  activeIndex: number | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<ChordEntry>) => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onAdd: (symbol: string) => void
}

export function ProgressionEditor({
  sections,
  keyTonic,
  keyMode,
  selectedId,
  activeIndex,
  onSelect,
  onUpdate,
  onRemove,
  onMove,
  onAdd,
}: ProgressionEditorProps) {
  const key = makeKey(keyTonic, keyMode)
  const diatonic = diatonicChords(key)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedId && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-index="${activeIndex}"]`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [selectedId, activeIndex])

  // Extract unique valid chords used in the song for quick access
  const chordsInSong = useMemo(() => {
    const unique = new Set<string>()
    sections.forEach(s => s.chords.forEach(c => {
      const p = parseChord(c.symbol)
      if (p.valid) unique.add(c.symbol)
    }))
    return Array.from(unique)
  }, [sections])

  return (
    <div className="flex flex-col gap-6" ref={scrollRef}>
      {/* Sections & Chord Cards */}
      <div className="flex flex-col gap-6">
        {sections.map((section, sIdx) => {
          let startIndex = 0
          for (let i = 0; i < sIdx; i++) {
            startIndex += sections[i].chords.length
          }

          return (
            <div key={section.id} className="flex flex-col gap-3">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-bold tracking-wider text-primary shadow-xs uppercase">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {section.name}
                  <span className="text-[10px] opacity-70">({section.chords.length})</span>
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              {/* Grid / Timeline of Chord Cards */}
              <div className="flex items-stretch gap-3 overflow-x-auto pb-2.5 pt-1 no-scrollbar scrollbar-thin">
                {section.chords.map((entry, idxWithinSection) => {
                  const globalIdx = startIndex + idxWithinSection
                  const parsed = parseChord(entry.symbol)
                  const invalid = entry.symbol.trim() !== "" && !parsed.valid
                  const selected = entry.id === selectedId
                  const active = activeIndex === globalIdx
                  const harm = getHarmonicFunction(entry.symbol, key)

                  return (
                    <div
                      key={entry.id}
                      data-index={globalIdx}
                      onClick={() => onSelect(entry.id)}
                      className={cn(
                        "group relative flex w-32 sm:w-34 shrink-0 flex-col justify-between rounded-2xl border p-3 transition-all duration-150 cursor-pointer select-none",
                        "bg-card/80 backdrop-blur-md shadow-sm",
                        selected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md shadow-primary/10 -translate-y-0.5"
                          : "border-border/80 hover:border-border hover:bg-card hover:-translate-y-0.5",
                        active && "border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-[1.02]",
                      )}
                    >
                      {/* Top Header: Index, Harmonic Role & Actions */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "flex size-4.5 items-center justify-center rounded-full font-mono text-[9px] font-bold",
                              active
                                ? "bg-amber-400 text-black font-extrabold"
                                : selected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {globalIdx + 1}
                          </span>

                          {/* Harmonic Function Badge */}
                          {harm.roman && (
                            <span
                              className={cn(
                                "rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-tight",
                                harm.badgeColor,
                              )}
                            >
                              {harm.roman}
                            </span>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            aria-label={`Move chord ${globalIdx + 1} left`}
                            title="Move left"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMove(entry.id, -1)
                            }}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20"
                            disabled={idxWithinSection === 0}
                          >
                            <ChevronLeft className="size-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move chord ${globalIdx + 1} right`}
                            title="Move right"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMove(entry.id, 1)
                            }}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20"
                            disabled={idxWithinSection === section.chords.length - 1}
                          >
                            <ChevronRight className="size-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete chord ${globalIdx + 1}`}
                            title="Delete chord"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemove(entry.id)
                            }}
                            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>

                      {/* Large Hero Chord Symbol */}
                      <div className="my-2">
                        <input
                          value={entry.symbol}
                          onChange={(e) => onUpdate(entry.id, { symbol: e.target.value })}
                          onFocus={() => onSelect(entry.id)}
                          aria-label={`Chord ${globalIdx + 1} symbol`}
                          spellCheck={false}
                          className={cn(
                            "w-full bg-transparent font-mono text-2xl sm:text-3xl font-black tracking-tight outline-hidden transition-colors",
                            invalid
                              ? "text-destructive"
                              : active
                                ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                                : "text-foreground",
                          )}
                        />
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mt-0.5">
                          <span className="truncate">{parsed.valid ? parsed.qualityLabel : invalid ? "Unknown" : "Triad"}</span>
                          <span className="font-mono opacity-80">{harm.label}</span>
                        </div>
                      </div>

                      {/* Beats Stepper */}
                      <div className="flex items-center justify-between rounded-xl bg-background/60 px-2 py-1 border border-border/50 shadow-inner">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Beats
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Decrease beats"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdate(entry.id, { beats: Math.max(1, entry.beats - 1) })
                            }}
                            className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Minus className="size-2.5" />
                          </button>
                          <span className="w-3.5 text-center font-mono text-xs font-bold tabular-nums text-foreground">
                            {entry.beats}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase beats"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdate(entry.id, { beats: Math.min(16, entry.beats + 1) })
                            }}
                            className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="size-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add Slot Button */}
                <button
                  type="button"
                  onClick={() => onAdd(key.tonic)}
                  className="flex w-28 sm:w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/20 text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary hover:scale-[1.02] cursor-pointer"
                  aria-label="Add chord to section"
                >
                  <div className="flex size-8 items-center justify-center rounded-xl bg-muted/60">
                    <Plus className="size-4" />
                  </div>
                  <span className="text-xs font-bold">Add Chord</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Palette Groupings */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md shadow-xs">
        {/* Diatonic quick-add */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Diatonic Scale Chords in {key.label}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">Click chord to append</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {diatonic.map((d) => {
              const harm = getHarmonicFunction(d.symbol, key)
              return (
                <button
                  key={d.degree}
                  type="button"
                  onClick={() => onAdd(d.symbol)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-background/60 px-3.5 py-2 shadow-xs transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer",
                    harm.badgeColor,
                  )}
                >
                  <span className="font-mono text-xs font-extrabold">{d.roman}</span>
                  <span className="font-mono text-sm font-black text-foreground">{d.symbol}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chords in Song (Recently Used) */}
        {chordsInSong.length > 0 && (
          <div className="border-t border-border/50 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progression Chords
            </div>
            <div className="flex flex-wrap gap-2">
              {chordsInSong.map((symbol: string) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onAdd(symbol)}
                  className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-3 py-1.5 font-mono text-xs font-bold shadow-xs transition-all hover:border-primary/60 hover:bg-muted cursor-pointer"
                >
                  <span>{symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
