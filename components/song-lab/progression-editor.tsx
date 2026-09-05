"use client"

/**
 * BandMate — Progression editor.
 *
 * Editable list of chord slots plus a diatonic quick-add palette. Each slot
 * shows a live-validated chord symbol, its beat length, and controls to
 * reorder / remove. Clicking a slot selects it for inspection + playback.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, X, ChevronLeft, ChevronRight, ChevronDown, Minus, Sparkles, Copy, Home, ArrowRightLeft, Zap, Shield, Volume2, GripVertical } from "lucide-react"
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
import { getHarmonicFunction, type HarmonicRole } from "@/lib/music/analysis"
import { suggestNextChords } from "@/lib/music/chord-suggester"
import type { ChordEntry, Section } from "@/lib/music/types"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { playableVoicing } from "@/lib/music/chords"

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

function HarmonicBadge({ role, roman, label }: { role: HarmonicRole; roman: string | null; label: string }) {
  const config = {
    tonic: {
      text: "T",
      aria: "Tonic Function",
      cls: "bg-amber-400 text-zinc-950 font-black border-amber-300",
    },
    subdominant: {
      text: "SD",
      aria: "Subdominant Function",
      cls: "bg-orange-500 text-zinc-950 font-black border-orange-400",
    },
    dominant: {
      text: "D",
      aria: "Dominant Function",
      cls: "bg-rose-500 text-white font-black border-rose-400",
    },
    chromatic: {
      text: "C",
      aria: "Chromatic Function",
      cls: "bg-cyan-400 text-zinc-950 font-black border-cyan-300",
    },
  }[role]

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-1.5 min-w-[20px] h-5 font-mono text-[9.5px] tracking-tight border shadow-xs shrink-0 select-none",
        config.cls
      )}
      aria-label={`${config.aria}: ${roman ?? ""} (${label})`}
      title={`${label}${roman ? `: ${roman}` : ""}`}
    >
      <span>{config.text}</span>
    </span>
  )
}

import { SongImportModal } from "./song-import-modal"
import type { ParsedSongResult } from "@/lib/music/song-parser"

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
  onImportSong?: (songData: ParsedSongResult) => void
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
  onImportSong,
}: ProgressionEditorProps) {
  const key = makeKey(keyTonic, keyMode)
  const diatonic = diatonicChords(key)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handlePreviewChord = (symbol: string) => {
    const p = parseChord(symbol)
    if (!p.valid) return
    const midis = playableVoicing(p, { octave: 4 }).map((n) => n.midi)
    getAudioEngine().playChord(midis, { duration: 1.2 })
  }

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  useEffect(() => {
    if (activeIndex !== null && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
      if (el) {
        const container = scrollRef.current.parentElement
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const elRect = el.getBoundingClientRect()
          if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
            const topOffset = el.offsetTop - container.offsetTop
            container.scrollTo({ top: Math.max(0, topOffset - 20), behavior: "smooth" })
          }
        }
      }
    }
  }, [activeIndex])

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
    <div className="flex flex-col gap-6 pb-24" ref={scrollRef}>
      {/* Sections & Chord Cards */}
      <div className="flex flex-col gap-6">
        {sections.map((section, sIdx) => {
          let startIndex = 0
          for (let i = 0; i < sIdx; i++) {
            startIndex += sections[i].chords.length
          }

          return (
            <div key={section.id} className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-3 sm:p-4 backdrop-blur-md shadow-md">
              {/* Section Header with Collapse Chevron */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-amber-500/30 bg-secondary/80 px-2.5 sm:px-3 py-1 font-mono text-xs font-bold tracking-wider text-foreground shadow-xs uppercase hover:bg-secondary transition-all cursor-pointer"
                  title={collapsedSections.has(section.id) ? "Expand section" : "Collapse section"}
                >
                  <ChevronDown className={cn("size-3.5 text-amber-400 transition-transform duration-200", collapsedSections.has(section.id) && "-rotate-90")} />
                  <input
                    type="text"
                    value={section.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onRenameSection?.(section.id, e.target.value)}
                    className="bg-transparent outline-hidden w-auto min-w-[3ch] max-w-[20ch] text-foreground font-mono text-xs font-bold uppercase tracking-wider cursor-text"
                    spellCheck={false}
                    aria-label={`Section name: ${section.name}`}
                  />
                  <span className="text-[10px] text-muted-foreground font-bold tabular-nums">({section.chords.length})</span>
                </button>
                <div className="h-px flex-1 bg-border/60" />

                {/* Add Chord to Section Button */}
                <button
                  type="button"
                  onClick={() => onAdd(key.tonic, section.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 sm:px-3 py-1 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20 active:scale-[0.98] cursor-pointer shadow-xs"
                  title={`Add chord to ${section.name}`}
                  aria-label={`Add chord to ${section.name}`}
                >
                  <Plus className="size-3.5 text-amber-400" />
                  <span className="sm:hidden">Chord</span>
                  <span className="hidden sm:inline">Add Chord</span>
                </button>

                {/* Auto-Voice Button — optimize voice leading across this section */}
                {section.chords.length > 1 && onAutoVoice && (
                  <button
                    type="button"
                    onClick={() => onAutoVoice(section.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 sm:px-3 py-1 text-xs font-bold text-foreground transition-all hover:bg-secondary active:scale-[0.98] cursor-pointer shadow-xs"
                    title="Automatically optimize inversions for smooth voice leading"
                    aria-label={`Auto-voice ${section.name} section`}
                  >
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Auto-Voice</span>
                  </button>
                )}

                {/* Delete Section Button — only show if more than 1 section */}
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteSection?.(section.id)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    aria-label={`Delete ${section.name} section`}
                    title={`Delete ${section.name} section`}
                  >
                    <X className="size-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>

              {/* If Collapsed: Render Compact Single-Line Summary Ribbon */}
              {collapsedSections.has(section.id) ? (
                <div
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-1.5 p-2 rounded-xl border border-border/80 bg-background/60 hover:bg-background/80 cursor-pointer transition-colors overflow-x-auto no-scrollbar select-none"
                  title="Click to expand section"
                >
                  {section.chords.map((c, i) => {
                    const harm = getHarmonicFunction(c.symbol, key)
                    return (
                      <span
                        key={c.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-xs font-mono font-bold shrink-0"
                      >
                        <HarmonicBadge role={harm.role} roman={harm.roman} label={harm.label} />
                        <span className="text-foreground font-bold">{c.symbol}</span>
                      </span>
                    )
                  })}
                  <span className="text-xs font-mono text-muted-foreground ml-auto shrink-0 pr-1">Tap to expand ▾</span>
                </div>
              ) : (
                /* 4-COLUMN WRAPPING GRID (4 BARS PER LINE - ZERO HORIZONTAL SCROLL) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-1">
                  {section.chords.map((entry, idxWithinSection) => {
                    const globalIdx = startIndex + idxWithinSection
                    const parsed = parseChord(entry.symbol)
                    const invalid = entry.symbol.trim() !== "" && !parsed.valid
                    const selected = entry.id === selectedId
                    const active = activeIndex === globalIdx
                    const harm = getHarmonicFunction(entry.symbol, key)

                    const roleGlow = {
                      tonic: "border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_rgba(251,191,36,0.12)]",
                      subdominant: "border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.12)]",
                      dominant: "border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.12)]",
                      chromatic: "border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.12)]",
                    }[harm.role]

                    const isBeingDragged = draggedId === entry.id
                    const isDragTarget = dragOverId === entry.id

                    return (
                      <div
                        key={entry.id}
                        data-index={globalIdx}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(entry.id)
                          e.dataTransfer.setData("text/plain", entry.id)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOverId(entry.id)
                        }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOverId(null)
                          const srcId = e.dataTransfer.getData("text/plain") || draggedId
                          if (srcId && srcId !== entry.id) {
                            const srcIdx = section.chords.findIndex((c) => c.id === srcId)
                            const targetIdx = idxWithinSection
                            if (srcIdx !== -1) {
                              const diff = targetIdx - srcIdx
                              if (diff !== 0) onMove(srcId, diff > 0 ? 1 : -1)
                            }
                          }
                          setDraggedId(null)
                        }}
                        onClick={() => onSelect(entry.id)}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border transition-all duration-150 cursor-pointer select-none",
                          "w-full p-2.5 sm:p-3.5 min-h-[85px] sm:min-h-[140px]",
                          "bg-secondary/90 backdrop-blur-md shadow-sm",
                          roleGlow,
                          isBeingDragged && "opacity-40 scale-95 border-dashed",
                          isDragTarget && "ring-2 ring-amber-400 border-amber-400 scale-105",
                          selected
                            ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/60 shadow-md shadow-amber-500/20 -translate-y-0.5"
                            : "hover:-translate-y-0.5",
                          active && "border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/60 shadow-[0_0_18px_rgba(52,211,153,0.4)] scale-[1.02]",
                        )}
                      >
                        {/* Top Header: Index, Harmonic Role, Beats & Actions */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={cn(
                                "flex size-4 sm:size-5 items-center justify-center rounded-full font-mono text-[9px] sm:text-xs font-bold tabular-nums shrink-0",
                                active
                                  ? "bg-emerald-400 text-black font-extrabold"
                                  : selected
                                    ? "bg-amber-400 text-black font-extrabold"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {globalIdx + 1}
                            </span>

                            {/* Accessible Dual-Coded Harmonic Badge */}
                            <HarmonicBadge role={harm.role} roman={harm.roman} label={harm.label} />

                            {/* Inversion Badge */}
                            {entry.inversion !== undefined && entry.inversion > 0 && (
                              <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-amber-300 shrink-0">
                                i{entry.inversion}
                              </span>
                            )}
                          </div>

                          {/* Mobile Beat Badge (< sm) */}
                          <div className="sm:hidden font-mono text-[9px] font-bold tabular-nums text-amber-300 bg-background/80 px-1 py-0.2 rounded border border-border shrink-0">
                            {entry.beats}b
                          </div>

                          {/* Card Actions (Desktop hover) */}
                          <div
                            className={cn(
                              "hidden sm:flex items-center gap-0.5 transition-opacity",
                              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                            )}
                          >
                            <button
                              type="button"
                              aria-label={`Preview ${entry.symbol} chord audio`}
                              title="Audition / Preview Chord"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreviewChord(entry.symbol)
                              }}
                              className="rounded p-1 text-amber-400 hover:bg-amber-500/20 transition-colors touch-manipulation cursor-pointer"
                            >
                              <Volume2 className="size-3.5" />
                            </button>
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
                              className="rounded p-1 text-muted-foreground hover:bg-amber-500/20 hover:text-amber-300 transition-colors touch-manipulation cursor-pointer"
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
                        <div className="my-1 sm:my-2">
                          <input
                            value={entry.symbol}
                            onChange={(e) => onUpdate(entry.id, { symbol: e.target.value })}
                            onFocus={() => onSelect(entry.id)}
                            aria-label={`Chord ${globalIdx + 1} symbol`}
                            spellCheck={false}
                            className={cn(
                              "w-full bg-transparent font-mono text-base sm:text-2xl md:text-3xl font-extrabold tracking-tight outline-hidden transition-colors truncate",
                              invalid
                                ? "text-destructive"
                                : active
                                  ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                                  : "text-foreground",
                            )}
                          />
                          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-xs font-semibold mt-0.5">
                            <span className="truncate flex-1 min-w-0 text-muted-foreground">
                              {parsed.valid ? getShortQuality(parsed.qualityLabel) : invalid ? "Unknown" : "Triad"}
                            </span>
                            <span className="font-mono text-muted-foreground shrink-0 font-bold">
                              {getShortHarmonic(harm.label)}
                            </span>
                          </div>
                        </div>

                        {/* Beats Stepper (Desktop Only) */}
                        <div className="hidden sm:flex items-center justify-between rounded-xl bg-background/80 px-2 py-1 border border-border shadow-inner">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
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
                              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation cursor-pointer"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-4 text-center font-mono text-xs font-bold tabular-nums text-foreground">
                              {entry.beats}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase beats"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdate(entry.id, { beats: Math.min(16, entry.beats + 1) })
                              }}
                              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation cursor-pointer"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Add Section & AI Import Menu Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-dashed border-border bg-card/40">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono px-1 flex items-center gap-1.5">
            <Plus className="size-3.5 text-amber-400" />
            <span>Section Arranger</span>
          </span>
          <div className="flex items-center gap-2">
            {onImportSong && <SongImportModal onImport={onImportSong} />}
            {onAddSection && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer shadow-xs"
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
            )}
          </div>
        </div>

        {/* Mobile Contextual Selected Chord Action Bar (< md) */}
        {selectedChord && (
          <div className="flex md:hidden items-center justify-between gap-1.5 p-2 rounded-xl border border-border bg-secondary/95 backdrop-blur-md shadow-lg min-h-[50px] animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-amber-300 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                {selectedChord.symbol}
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-background p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => onUpdate(selectedChord.id, { beats: Math.max(1, selectedChord.beats - 1) })}
                  className="size-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
                  aria-label="Decrease beats"
                >
                  <Minus className="size-4" />
                </button>
                <span className="font-mono text-xs font-bold px-1.5 tabular-nums text-foreground">
                  {selectedChord.beats}b
                </span>
                <button
                  type="button"
                  onClick={() => onUpdate(selectedChord.id, { beats: Math.min(16, selectedChord.beats + 1) })}
                  className="size-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
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
                className="h-9 min-w-[50px] px-2.5 text-xs font-bold gap-1 rounded-lg bg-background border-border text-foreground touch-manipulation"
                onClick={() => onMove(selectedChord.id, -1)}
                title="Move chord left"
              >
                <ChevronLeft className="size-3.5" />
                Left
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 min-w-[50px] px-2.5 text-xs font-bold gap-1 rounded-lg bg-background border-border text-foreground touch-manipulation"
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
                  className="size-9 p-0 rounded-lg bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 touch-manipulation"
                  onClick={() => onDuplicate(selectedChord.id)}
                  title="Duplicate chord"
                >
                  <Copy className="size-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="size-9 p-0 rounded-lg text-destructive hover:bg-destructive/10 touch-manipulation"
                onClick={() => onRemove(selectedChord.id)}
                title="Delete chord"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Palette Groupings: Diatonic, AI Suggestions, Song Chords */}
      <div className="flex flex-col gap-4 sm:gap-5 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg">
        {/* Diatonic quick-add */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground font-mono">
                Diatonic Scale Chords in {key.label}
              </span>
            </div>
            <span className="font-mono text-[10px] sm:text-xs text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              Click to Append
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3 py-1">
            {diatonic.map((d) => {
              const harm = getHarmonicFunction(d.symbol, key)
              return (
                <button
                  key={`${d.degree}-${d.symbol}`}
                  type="button"
                  onClick={() => onAdd(d.symbol)}
                  className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border border-border bg-secondary/80 shadow-md transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer text-center hover:border-amber-500/50"
                >
                  <HarmonicBadge role={harm.role} roman={d.roman} label={harm.label} />
                  <span className="font-mono text-sm sm:text-lg font-bold text-foreground mt-1">{d.symbol}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Smart AI Next Chord Recommendations */}
        {(() => {
          const suggestions = suggestNextChords(chordsInSong, key)
          return (
            <div className="border-t border-border/60 pt-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 font-mono">
                    AI Next Chord Suggestions
                  </span>
                </div>
                <span className="font-mono text-[10px] sm:text-xs text-muted-foreground font-bold">Recommended Flow</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {suggestions.map((s) => (
                  <button
                    key={`${s.symbol}-${s.label}`}
                    type="button"
                    onClick={() => onAdd(s.symbol)}
                    className="flex flex-col text-left p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer group shadow-md"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-base font-bold text-foreground group-hover:text-amber-300">
                        {s.symbol} <span className="text-xs text-amber-400/80 font-normal">({s.roman})</span>
                      </span>
                      <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">{s.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Chords in Song (Recently Used) */}
        {chordsInSong.length > 0 && (
          <div className="border-t border-border/50 pt-2 sm:pt-3">
            <div className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Progression Chords
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5">
              {chordsInSong.map((symbol: string) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onAdd(symbol)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 font-mono text-xs font-bold shadow-xs transition-all hover:border-amber-500/50 hover:bg-secondary cursor-pointer shrink-0"
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
