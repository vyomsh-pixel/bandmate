"use client"

/**
 * BandMate — Progression editor.
 *
 * Editable list of chord slots plus a diatonic quick-add palette. Each slot
 * shows a live-validated chord symbol, its beat length, and controls to
 * reorder / remove. Clicking a slot selects it for inspection + playback.
 */

import { useEffect, useMemo, useRef } from "react"
import { Plus, X, ChevronLeft, ChevronRight, Minus, Sparkles, Copy } from "lucide-react"
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
  onDuplicate?: (id: string) => void
  onDeleteSection?: (sectionId: string) => void
  onRenameSection?: (sectionId: string, name: string) => void
  onAutoVoice?: (sectionId: string) => void
  onAddSection?: (name: string) => void
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
  onDuplicate,
  onDeleteSection,
  onRenameSection,
  onAutoVoice,
  onAddSection,
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
    sections.forEach((s) =>
      s.chords.forEach((c) => {
        const p = parseChord(c.symbol)
        if (p.valid) unique.add(c.symbol)
      }),
    )
    return Array.from(unique)
  }, [sections])

  const selectedChord = useMemo(
    () => sections.flatMap((s) => s.chords).find((c) => c.id === selectedId) ?? null,
    [sections, selectedId],
  )

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
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => onRenameSection?.(section.id, e.target.value)}
                    className="bg-transparent outline-hidden w-20 sm:w-auto min-w-[3ch] max-w-[14ch] text-primary font-mono text-xs font-bold uppercase tracking-wider"
                    spellCheck={false}
                    aria-label={`Section name: ${section.name}`}
                  />
                  <span className="text-[10px] opacity-70">({section.chords.length})</span>
                </span>
                <div className="h-px flex-1 bg-border/60" />
                {/* Auto-Voice Button — optimize voice leading across this section */}
                {section.chords.length > 1 && onAutoVoice && (
                  <button
                    type="button"
                    onClick={() => onAutoVoice(section.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2 sm:px-2.5 py-1 text-[10px] font-bold text-primary transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
                    title="Automatically optimize inversions for smooth voice leading"
                    aria-label={`Auto-voice ${section.name} section`}
                  >
                    <Sparkles className="size-3 text-primary" />
                    <span>Auto-Voice</span>
                  </button>
                )}
                {/* Delete Section Button — only show if more than 1 section */}
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteSection?.(section.id)}
                    className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    aria-label={`Delete ${section.name} section`}
                    title={`Delete ${section.name} section`}
                  >
                    <X className="size-3" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>

              {/* Grid / Timeline of Chord Cards */}
              <div className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scrollbar-thin">
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
                        "group relative flex w-28 sm:w-36 md:w-40 shrink-0 flex-col justify-between rounded-xl sm:rounded-2xl border p-2 sm:p-3 transition-all duration-150 cursor-pointer select-none",
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

                          {/* Inversion Badge */}
                          {entry.inversion !== undefined && entry.inversion > 0 && (
                            <span className="rounded-md border border-primary/40 bg-primary/15 px-1 py-0.5 font-mono text-[8.5px] font-black text-primary">
                              Inv {entry.inversion}
                            </span>
                          )}
                        </div>

                        {/* Card Actions (Visible on hover and always when selected on touch/mobile) */}
                        <div
                          className={cn(
                            "flex items-center gap-0.5 transition-opacity",
                            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                          )}
                        >
                          <button
                            type="button"
                            aria-label={`Move chord ${globalIdx + 1} left`}
                            title="Move left"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMove(entry.id, -1)
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 touch-manipulation cursor-pointer"
                            disabled={idxWithinSection === 0}
                          >
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move chord ${globalIdx + 1} right`}
                            title="Move right"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMove(entry.id, 1)
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 touch-manipulation cursor-pointer"
                            disabled={idxWithinSection === section.chords.length - 1}
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Duplicate chord ${entry.symbol}`}
                            title="Duplicate / Repeat chord"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDuplicate?.(entry.id)
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors touch-manipulation cursor-pointer"
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete chord ${globalIdx + 1}`}
                            title="Delete chord"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemove(entry.id)
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive touch-manipulation cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Large Hero Chord Symbol */}
                      <div className="my-1.5 sm:my-2">
                        <input
                          value={entry.symbol}
                          onChange={(e) => onUpdate(entry.id, { symbol: e.target.value })}
                          onFocus={() => onSelect(entry.id)}
                          aria-label={`Chord ${globalIdx + 1} symbol`}
                          spellCheck={false}
                          className={cn(
                            "w-full bg-transparent font-mono text-xl sm:text-2xl md:text-3xl font-black tracking-tight outline-hidden transition-colors",
                            invalid
                              ? "text-destructive"
                              : active
                                ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                                : "text-foreground",
                          )}
                        />
                        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-semibold text-muted-foreground mt-0.5">
                          <span className="truncate flex-1 min-w-0">{parsed.valid ? parsed.qualityLabel : invalid ? "Unknown" : "Triad"}</span>
                          <span className="font-mono opacity-80 shrink-0">{harm.label}</span>
                        </div>
                      </div>

                      {/* Beats Stepper */}
                      <div className="flex items-center justify-between rounded-lg sm:rounded-xl bg-background/60 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-border/50 shadow-inner">
                        <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Beats
                        </span>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            aria-label="Decrease beats"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdate(entry.id, { beats: Math.max(1, entry.beats - 1) })
                            }}
                            className="flex size-5 sm:size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation cursor-pointer"
                          >
                            <Minus className="size-2.5 sm:size-3" />
                          </button>
                          <span className="w-3.5 sm:w-4 text-center font-mono text-xs font-bold tabular-nums text-foreground">
                            {entry.beats}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase beats"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdate(entry.id, { beats: Math.min(16, entry.beats + 1) })
                            }}
                            className="flex size-5 sm:size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation cursor-pointer"
                          >
                            <Plus className="size-2.5 sm:size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Duplicate Selected Shortcut Button */}
                {selectedChord && (
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(selectedChord.id)}
                    className="flex w-24 sm:w-32 md:w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-xl sm:rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary transition-all hover:bg-primary/15 hover:border-primary hover:scale-[1.02] cursor-pointer p-2"
                    aria-label={`Duplicate selected chord ${selectedChord.symbol}`}
                    title="Repeat / Duplicate selected chord (D)"
                  >
                    <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-primary/20">
                      <Copy className="size-2.5 sm:size-3" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-extrabold truncate max-w-[90%]">Repeat {selectedChord.symbol}</span>
                    <span className="font-mono text-[8px] sm:text-[9px] text-muted-foreground">Press D</span>
                  </button>
                )}

                {/* Add Slot Button */}
                <button
                  type="button"
                  onClick={() => onAdd(key.tonic)}
                  className="flex w-24 sm:w-32 md:w-36 shrink-0 flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border-2 border-dashed border-border/80 bg-card/20 text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary hover:scale-[1.02] cursor-pointer p-2"
                  aria-label="Add chord to section"
                >
                  <div className="flex size-6 sm:size-8 items-center justify-center rounded-xl bg-muted/60">
                    <Plus className="size-3.5 sm:size-4" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold">Add Chord</span>
                </button>
              </div>
            </div>
          )
        })}

        {/* Add Section Quick Bar */}
        {onAddSection && (
          <div className="flex items-center gap-1.5 flex-wrap p-2 sm:p-2.5 rounded-xl border border-dashed border-border/80 bg-card/30">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono px-1">
              + Add Section:
            </span>
            {["Verse", "Chorus", "Pre-Chorus", "Bridge", "Intro", "Outro"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onAddSection(type)}
                className="rounded-lg border border-border/70 bg-background/70 px-2 sm:px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-semibold text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-95 shadow-xs"
                title={`Add another ${type} section`}
              >
                + {type}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onAddSection("Custom")}
              className="rounded-lg border border-primary/40 bg-primary/10 px-2 sm:px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-semibold text-primary transition-all hover:border-primary hover:bg-primary/20 cursor-pointer active:scale-95 shadow-xs"
              title="Add a custom named section"
            >
              + Custom
            </button>
          </div>
        )}
      </div>

      {/* Palette Groupings */}
      <div className="flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-border/80 bg-card/40 p-3 sm:p-5 backdrop-blur-md shadow-xs">
        {/* Diatonic quick-add */}
        <div>
          <div className="mb-1.5 sm:mb-2.5 flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
              Diatonic Scale Chords in {key.label}
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground">Click chord to append</span>
          </div>
          <div className="flex sm:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {diatonic.map((d) => {
              const harm = getHarmonicFunction(d.symbol, key)
              return (
                <button
                  key={`${d.degree}-${d.symbol}`}
                  type="button"
                  onClick={() => onAdd(d.symbol)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border bg-background/60 px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-xs transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer shrink-0",
                    harm.badgeColor,
                  )}
                >
                  <span className="font-mono text-[11px] sm:text-xs font-extrabold">{d.roman}</span>
                  <span className="font-mono text-xs sm:text-sm font-black text-foreground">{d.symbol}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chords in Song (Recently Used) */}
        {chordsInSong.length > 0 && (
          <div className="border-t border-border/50 pt-2 sm:pt-3">
            <div className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progression Chords
            </div>
            <div className="flex sm:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
              {chordsInSong.map((symbol: string) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onAdd(symbol)}
                  className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 font-mono text-xs font-bold shadow-xs transition-all hover:border-primary/60 hover:bg-muted cursor-pointer shrink-0"
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
