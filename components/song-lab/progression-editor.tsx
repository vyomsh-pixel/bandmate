"use client"

/**
 * BandMate — Progression editor.
 *
 * Editable list of chord slots plus a diatonic quick-add palette. Each slot
 * shows a live-validated chord symbol, its beat length, and controls to
 * reorder / remove. Clicking a slot selects it for inspection + playback.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, X, ChevronLeft, ChevronRight, ChevronDown, Minus, Sparkles, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { parseChord } from "@/lib/music/chord-parser"
import { diatonicChords, makeKey } from "@/lib/music/scales"
import { getHarmonicFunction } from "@/lib/music/analysis"
import { suggestNextChords } from "@/lib/music/chord-suggester"
import type { ChordEntry, Section } from "@/lib/music/types"

function getShortQuality(label: string): string {
  if (!label) return ""
  return label
    .replace("Major 7th", "Maj7")
    .replace("Minor 7th", "Min7")
    .replace("Dominant 7th", "Dom7")
    .replace("Half-Diminished 7th", "m7♭5")
    .replace("Half-Diminished", "m7♭5")
    .replace("Diminished 7th", "Dim7")
    .replace("Diminished", "Dim")
    .replace("Suspended 4th", "Sus4")
    .replace("Suspended 2nd", "Sus2")
    .replace("Augmented", "Aug")
    .replace("Major", "Maj")
    .replace("Minor", "Min")
}

function getShortHarmonic(label: string): string {
  if (!label) return ""
  return label
    .replace("Subdominant", "Sub")
    .replace("Dominant", "Dom")
    .replace("Tonic Rel", "Tonic")
    .replace("Secondary Dom", "Sec Dom")
}

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
  onAdd: (symbol: string, targetSectionId?: string) => void
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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

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
              {/* Section Header with Collapse Chevron */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-zinc-700/80 bg-zinc-800/80 px-2.5 sm:px-3 py-1 font-mono text-xs font-bold tracking-wider text-zinc-100 shadow-xs uppercase hover:bg-zinc-700/80 transition-all cursor-pointer"
                  title={collapsedSections.has(section.id) ? "Expand section" : "Collapse section"}
                >
                  <ChevronDown className={cn("size-3.5 text-zinc-400 transition-transform duration-200", collapsedSections.has(section.id) && "-rotate-90")} />
                  <input
                    type="text"
                    value={section.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onRenameSection?.(section.id, e.target.value)}
                    className="bg-transparent outline-hidden w-auto min-w-[3ch] max-w-[20ch] text-zinc-100 font-mono text-xs font-bold uppercase tracking-wider cursor-text"
                    spellCheck={false}
                    aria-label={`Section name: ${section.name}`}
                  />
                  <span className="text-[10px] text-zinc-400 font-bold">({section.chords.length})</span>
                </button>
                <div className="h-px flex-1 bg-border/60" />

                {/* Add Chord to Section Button */}
                <button
                  type="button"
                  onClick={() => onAdd(key.tonic, section.id)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-800/90 px-2 sm:px-2.5 py-1 text-[10px] font-bold text-zinc-200 transition-all hover:bg-zinc-700 hover:text-white active:scale-[0.98] cursor-pointer shadow-xs"
                  title={`Add chord to ${section.name}`}
                  aria-label={`Add chord to ${section.name}`}
                >
                  <Plus className="size-3 text-emerald-400" />
                  <span className="sm:hidden">Chord</span>
                  <span className="hidden sm:inline">Add Chord</span>
                </button>

                {/* Auto-Voice Button — optimize voice leading across this section */}
                {section.chords.length > 1 && onAutoVoice && (
                  <button
                    type="button"
                    onClick={() => onAutoVoice(section.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/90 px-2 sm:px-2.5 py-1 text-[10px] font-bold text-zinc-200 transition-all hover:bg-zinc-700 hover:text-white hover:border-zinc-600 active:scale-[0.98] cursor-pointer shadow-xs"
                    title="Automatically optimize inversions for smooth voice leading"
                    aria-label={`Auto-voice ${section.name} section`}
                  >
                    <Sparkles className="size-3 text-amber-400" />
                    <span>Auto-Voice</span>
                  </button>
                )}

                {/* Delete Section Button — only show if more than 1 section */}
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteSection?.(section.id)}
                    className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-2 py-1 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    aria-label={`Delete ${section.name} section`}
                    title={`Delete ${section.name} section`}
                  >
                    <X className="size-3" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>

              {/* If Collapsed: Render Compact Single-Line Roman Numeral Summary Ribbon */}
              {collapsedSections.has(section.id) ? (
                <div
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 cursor-pointer transition-colors overflow-x-auto no-scrollbar select-none"
                  title="Click to expand section"
                >
                  {section.chords.map((c, i) => {
                    const harm = getHarmonicFunction(c.symbol, key)
                    return (
                      <span
                        key={c.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs font-mono font-bold shrink-0"
                      >
                        <span className={cn("text-[9px] font-black", harm.badgeColor ? "text-amber-400" : "text-zinc-400")}>
                          {harm.roman || `${i + 1}`}
                        </span>
                        <span className="text-zinc-100">{c.symbol}</span>
                      </span>
                    )
                  })}
                  <span className="text-[10px] font-mono text-zinc-400 ml-auto shrink-0 pr-1">Tap to expand ▾</span>
                </div>
              ) : (
                /* Grid / Timeline of Chord Cards: 4-COL GRID ON MOBILE, ZERO CUTOFF */
                <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-stretch sm:gap-3 sm:overflow-x-auto pb-1 sm:pb-2 pt-0.5 no-scrollbar scrollbar-thin">
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
                          "group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border transition-all duration-150 cursor-pointer select-none",
                          "w-full sm:w-36 md:w-40 sm:shrink-0 p-1.5 sm:p-3 min-h-[76px] sm:min-h-[140px]",
                          "bg-card/90 backdrop-blur-md shadow-xs",
                          selected
                            ? "border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/60 shadow-md shadow-amber-400/10 -translate-y-0.5"
                            : "border-border/80 hover:border-border hover:bg-card hover:-translate-y-0.5",
                          active && "border-emerald-400 bg-emerald-400/15 ring-2 ring-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.35)] scale-[1.02]",
                        )}
                      >
                        {/* Top Header: Index, Harmonic Role, Beats & Actions */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={cn(
                                "flex size-4 sm:size-4.5 items-center justify-center rounded-full font-mono text-[8px] sm:text-[9px] font-black shrink-0",
                                active
                                  ? "bg-emerald-400 text-black font-extrabold"
                                  : selected
                                    ? "bg-amber-400 text-black font-extrabold"
                                    : "bg-muted text-zinc-300",
                              )}
                            >
                              {globalIdx + 1}
                            </span>

                            {/* Harmonic Function Badge */}
                            {harm.roman && (
                              <span
                                className={cn(
                                  "rounded px-1 sm:px-1.5 py-0.2 sm:py-0.5 font-mono text-[8px] sm:text-[9px] font-black tracking-tight shrink-0 border",
                                  harm.badgeColor,
                                )}
                              >
                                {harm.roman}
                              </span>
                            )}

                            {/* Inversion Badge */}
                            {entry.inversion !== undefined && entry.inversion > 0 && (
                              <span className="rounded border border-primary/40 bg-primary/15 px-0.5 sm:px-1 py-0.2 font-mono text-[7.5px] sm:text-[8.5px] font-black text-primary shrink-0">
                                i{entry.inversion}
                              </span>
                            )}
                          </div>

                          {/* Mobile Beat Badge (< sm) */}
                          <div className="sm:hidden font-mono text-[8.5px] font-bold text-zinc-200 bg-zinc-800/80 px-1 py-0.2 rounded border border-zinc-700/80 shrink-0">
                            {entry.beats}b
                          </div>

                          {/* Card Actions (Desktop hover, mobile uses dedicated contextual toolbar) */}
                          <div
                            className={cn(
                              "hidden sm:flex items-center gap-0.5 transition-opacity",
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
                        <div className="my-0.5 sm:my-2">
                          <input
                            value={entry.symbol}
                            onChange={(e) => onUpdate(entry.id, { symbol: e.target.value })}
                            onFocus={() => onSelect(entry.id)}
                            aria-label={`Chord ${globalIdx + 1} symbol`}
                            spellCheck={false}
                            className={cn(
                              "w-full bg-transparent font-mono text-base sm:text-2xl md:text-3xl font-black tracking-tight outline-hidden transition-colors truncate",
                              invalid
                                ? "text-destructive"
                                : active
                                  ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                                  : "text-white",
                            )}
                          />
                          <div className="flex items-center justify-between gap-1 text-[8px] sm:text-[10px] font-bold mt-0.2 sm:mt-0.5">
                            <span className="truncate flex-1 min-w-0 text-zinc-200">
                              {parsed.valid ? getShortQuality(parsed.qualityLabel) : invalid ? "Unknown" : "Triad"}
                            </span>
                            <span className="font-mono text-zinc-300 shrink-0">
                              {getShortHarmonic(harm.label)}
                            </span>
                          </div>
                        </div>

                        {/* Beats Stepper (Desktop Only — Mobile uses the dedicated thumb action bar) */}
                        <div className="hidden sm:flex items-center justify-between rounded-lg sm:rounded-xl bg-background/60 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-border/50 shadow-inner">
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-300">
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

                  {/* Duplicate Selected Shortcut Button (Desktop Only) */}
                  {selectedChord && (
                    <button
                      type="button"
                      onClick={() => onDuplicate?.(selectedChord.id)}
                      className="hidden sm:flex w-24 sm:w-32 md:w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-xl sm:rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary transition-all hover:bg-primary/15 hover:border-primary hover:scale-[1.02] cursor-pointer p-2"
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

                  {/* Add Slot Button (Desktop Only — Mobile uses the Header Add button) */}
                  <button
                    type="button"
                    onClick={() => onAdd(key.tonic)}
                    className="hidden sm:flex w-24 sm:w-32 md:w-36 shrink-0 flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border-2 border-dashed border-border/80 bg-card/20 text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary hover:scale-[1.02] cursor-pointer p-2"
                    aria-label="Add chord to section"
                  >
                    <div className="flex size-6 sm:size-8 items-center justify-center rounded-xl bg-muted/60">
                      <Plus className="size-3.5 sm:size-4" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold">Add Chord</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add Section Menu Bar */}
        {onAddSection && (
          <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border border-dashed border-border/80 bg-card/30">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono px-1 flex items-center gap-1.5">
              <Plus className="size-3.5 text-primary" />
              <span>Section Arranger</span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-lg border-primary/40 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>+ Add Section</span>
                  <ChevronDown className="size-3 ml-0.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 z-50">
                {["Verse", "Chorus", "Pre-Chorus", "Bridge", "Intro", "Outro", "Custom"].map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => onAddSection(type)}
                    className="cursor-pointer font-bold text-xs flex items-center justify-between py-2"
                  >
                    <span>+ {type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">Section</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Mobile Contextual Selected Chord Action Bar (< md) — 44px HIG Touch Targets */}
        {selectedChord && (
          <div className="flex md:hidden items-center justify-between gap-1.5 p-2 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-md shadow-lg min-h-[50px] animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-amber-400 px-2.5 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30">
                {selectedChord.symbol}
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-zinc-800/90 p-0.5 border border-zinc-700">
                <button
                  type="button"
                  onClick={() => onUpdate(selectedChord.id, { beats: Math.max(1, selectedChord.beats - 1) })}
                  className="size-9 flex items-center justify-center rounded-md text-zinc-300 hover:text-white active:scale-90 touch-manipulation cursor-pointer"
                  aria-label="Decrease beats"
                >
                  <Minus className="size-4" />
                </button>
                <span className="font-mono text-xs font-bold px-1.5 tabular-nums text-white">
                  {selectedChord.beats}b
                </span>
                <button
                  type="button"
                  onClick={() => onUpdate(selectedChord.id, { beats: Math.min(16, selectedChord.beats + 1) })}
                  className="size-9 flex items-center justify-center rounded-md text-zinc-300 hover:text-white active:scale-90 touch-manipulation cursor-pointer"
                  aria-label="Increase beats"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-9 min-w-[50px] px-2.5 text-xs font-bold gap-1 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white touch-manipulation"
                onClick={() => onMove(selectedChord.id, -1)}
                title="Move chord left"
              >
                <ChevronLeft className="size-3.5" />
                Left
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 min-w-[50px] px-2.5 text-xs font-bold gap-1 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white touch-manipulation"
                onClick={() => onMove(selectedChord.id, 1)}
                title="Move chord right"
              >
                Right
                <ChevronRight className="size-3.5" />
              </Button>
              {onDuplicate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="size-9 p-0 rounded-lg bg-zinc-800 text-amber-400 border-amber-400/30 hover:bg-amber-400/10 touch-manipulation"
                  onClick={() => onDuplicate(selectedChord.id)}
                  title="Duplicate chord"
                >
                  <Copy className="size-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="size-9 p-0 rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 touch-manipulation"
                onClick={() => onRemove(selectedChord.id)}
                title="Delete chord"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Palette Groupings: 4-COL ZERO-CLIPPING WRAPPING GRID */}
      <div className="flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-border/80 bg-card/40 p-3 sm:p-5 backdrop-blur-md shadow-xs">
        {/* Diatonic quick-add (FIRST) */}
        <div>
          <div className="mb-1.5 sm:mb-2.5 flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-100 font-mono">
              Diatonic Scale Chords in {key.label}
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] text-zinc-300 font-bold">Click to append</span>
          </div>
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 py-0.5">
            {diatonic.map((d) => {
              const harm = getHarmonicFunction(d.symbol, key)
              return (
                <button
                  key={`${d.degree}-${d.symbol}`}
                  type="button"
                  onClick={() => onAdd(d.symbol)}
                  className={cn(
                    "flex items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border bg-background/60 px-2 sm:px-3.5 py-1.5 sm:py-2 shadow-xs transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer w-full sm:w-auto",
                    harm.badgeColor,
                  )}
                >
                  <span className="font-mono text-[10px] sm:text-xs font-black">{d.roman}</span>
                  <span className="font-mono text-xs sm:text-sm font-black text-foreground">{d.symbol}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Smart AI Next Chord Recommendations (SECOND) */}
        {(() => {
          const suggestions = suggestNextChords(chordsInSong, key)
          return (
            <div className="border-t border-border/50 pt-3">
              <div className="mb-1.5 sm:mb-2 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  <span>AI Next Chord Suggestions</span>
                </span>
                <span className="font-mono text-[9px] sm:text-[10px] text-zinc-400 font-bold">1-Tap Append</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {suggestions.map((s) => (
                  <button
                    key={`${s.symbol}-${s.label}`}
                    type="button"
                    onClick={() => onAdd(s.symbol)}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/15 hover:border-amber-400/60 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-mono text-sm font-black text-white group-hover:text-amber-300">
                        {s.symbol} <span className="text-xs text-amber-400 font-normal">({s.roman})</span>
                      </span>
                      <span className="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-300 line-clamp-1">{s.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Chords in Song (Recently Used) */}
        {chordsInSong.length > 0 && (
          <div className="border-t border-border/50 pt-2 sm:pt-3">
            <div className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-300">
              Progression Chords
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5">
              {chordsInSong.map((symbol: string) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onAdd(symbol)}
                  className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/60 px-2.5 py-1.5 font-mono text-xs font-bold shadow-xs transition-all hover:border-primary/60 hover:bg-muted cursor-pointer shrink-0"
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
