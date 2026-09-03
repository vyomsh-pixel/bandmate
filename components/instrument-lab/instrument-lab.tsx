"use client"

import { useMemo, useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Sparkles, Anchor, RotateCcw } from "lucide-react"
import { GuitarFretboard } from "./guitar-fretboard"
import { SoloCoach } from "./solo-coach"
import type { Song } from "@/lib/music/types"
import { parseChord } from "@/lib/music/chord-parser"
import { makeKey } from "@/lib/music/scales"
import { suggestCapo, chordShapeForCapo } from "@/lib/music/capo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface InstrumentLabProps {
  song: Song
  onUpdate: (id: string, patch: Partial<Song> | ((s: Song) => Partial<Song>)) => void
}

export function InstrumentLab({ song }: InstrumentLabProps) {
  const allChords = useMemo(() => song.sections.flatMap((s) => s.chords), [song.sections])
  const [activeChordId, setActiveChordId] = useState<string | null>(allChords[0]?.id ?? null)
  const [capoFret, setCapoFret] = useState<number>(0)

  // Ensure selection remains valid when song changes
  const activeEntry = allChords.find((c) => c.id === activeChordId) ?? allChords[0] ?? null
  const concertChord = activeEntry ? parseChord(activeEntry.symbol) : null
  const keyObj = makeKey(song.keyTonic, song.keyMode)

  // Auto Capo calculation: find optimal fret to maximize open chords
  const chordSymbols = useMemo(() => allChords.map((c) => c.symbol), [allChords])
  const capoSuggestions = useMemo(() => suggestCapo(chordSymbols, keyObj), [chordSymbols, keyObj])
  const bestCapoSuggestion = capoSuggestions.find((s) => s.fret > 0 && s.score > 0) ?? null

  // Calculate Capo chord shape when capo is active
  const capoSymbol = useMemo(() => {
    if (!activeEntry?.symbol || capoFret === 0) return null
    return chordShapeForCapo(activeEntry.symbol, capoFret, keyObj.accidental)
  }, [activeEntry?.symbol, capoFret, keyObj.accidental])

  const capoChord = useMemo(() => {
    if (!capoSymbol) return null
    return parseChord(capoSymbol)
  }, [capoSymbol])

  // Displayed chord on fretboard: Capo shape if capo > 0, otherwise concert chord
  const activeFretboardChord = capoFret > 0 && capoChord?.valid ? capoChord : concertChord

  // Section of currently active chord
  const activeSectionId = song.sections.find((s) => s.chords.some((c) => c.id === activeEntry?.id))?.id ?? song.sections[0]?.id
  const [selectedSectionId, setSelectedSectionId] = useState<string>(activeSectionId)

  // Sync selected section with active chord if user steps through
  const currentSection = song.sections.find((s) => s.id === (selectedSectionId || activeSectionId)) ?? song.sections[0]

  // Step through all chords in progression
  const activeIdx = allChords.findIndex((c) => c.id === (activeEntry?.id ?? activeChordId))
  const handlePrevChord = () => {
    if (activeIdx > 0) {
      const prev = allChords[activeIdx - 1]
      setActiveChordId(prev.id)
      const sec = song.sections.find(s => s.chords.some(c => c.id === prev.id))
      if (sec) setSelectedSectionId(sec.id)
    }
  }

  const handleNextChord = () => {
    if (activeIdx < allChords.length - 1) {
      const next = allChords[activeIdx + 1]
      setActiveChordId(next.id)
      const sec = song.sections.find(s => s.chords.some(c => c.id === next.id))
      if (sec) setSelectedSectionId(sec.id)
    }
  }

  // Touch Swipe Gesture Handling (Swipe left = Next chord, Swipe right = Prev chord)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY

    // Ensure horizontal swipe is dominant over vertical scroll
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swiped LEFT -> Next chord
        handleNextChord()
      } else {
        // Swiped RIGHT -> Previous chord
        handlePrevChord()
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col bg-card/40 min-w-0 overflow-y-auto">
        <div className="flex-1 p-2.5 sm:p-5 flex flex-col gap-3">
          {/* Header Bar with Capo Quick Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎸</span>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-white">Guitar Workspace</h2>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs text-amber-400 border-amber-400/40 bg-amber-400/10">
                {song.keyTonic} {song.keyMode}
              </Badge>
              {capoFret > 0 && (
                <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-400/40 bg-emerald-400/15 font-bold">
                  Capo {capoFret}
                </Badge>
              )}
            </div>
          </div>

          {/* CAPO TOOLBAR & SMART AUTO-CAPO RECOMMENDATION ENGINE */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 sm:p-3 flex flex-col gap-2 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-300">
                <Anchor className="size-3.5 text-amber-400" />
                <span>Capo Position:</span>
              </div>

              {/* Capo Fret Selector Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((fret) => {
                  const isActive = capoFret === fret
                  return (
                    <button
                      key={fret}
                      type="button"
                      onClick={() => setCapoFret(fret)}
                      className={cn(
                        "h-7 min-w-[28px] px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer touch-manipulation",
                        isActive
                          ? "bg-amber-400 text-black shadow-xs font-black ring-1 ring-amber-300"
                          : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700/60",
                      )}
                    >
                      {fret === 0 ? "Off" : `fr.${fret}`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Smart Auto Capo Recommendation Pill */}
            {bestCapoSuggestion && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-medium truncate">
                  <Sparkles className="size-3.5 text-amber-400 shrink-0 animate-pulse" />
                  <span className="truncate">
                    <strong>Suggested Capo {bestCapoSuggestion.fret}:</strong> Play open shapes for key of {song.keyTonic}!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCapoFret(bestCapoSuggestion.fret)}
                  className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono text-[10px] font-black uppercase tracking-wider hover:bg-amber-300 transition-colors shrink-0 cursor-pointer"
                >
                  Apply Capo {bestCapoSuggestion.fret}
                </button>
              </div>
            )}
          </div>

          {/* UNIFIED HERO CARD: CHORD SELECTOR + FRETBOARD IN ONE SCREEN VIEW (ZERO SCROLL + TOUCH SWIPE) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden shrink-0 transition-all select-none"
          >
            {/* Chord Selector Bar: Section Tabs & Clickable Chord Buttons */}
            <div className="border-b border-zinc-800/80 bg-zinc-950/60 p-2 sm:p-3 flex flex-col gap-2">
              {/* Section Tabs Scroller */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {song.sections.map((section) => {
                  const isCurrentSec = section.id === currentSection?.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setSelectedSectionId(section.id)
                        if (section.chords[0]) setActiveChordId(section.chords[0].id)
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer",
                        isCurrentSec
                          ? "bg-zinc-700 text-white shadow-xs border border-zinc-600"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
                      )}
                    >
                      {section.name} ({section.chords.length})
                    </button>
                  )
                })}
              </div>

              {/* Chords in Current Section (Large, Instant Thumb Targets) */}
              <div className="flex items-center justify-between gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeIdx <= 0}
                  onClick={handlePrevChord}
                  className="size-8 sm:size-9 p-0 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white shrink-0 touch-manipulation"
                  aria-label="Previous chord in song"
                  title="Previous chord"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 justify-center py-0.5">
                  {currentSection?.chords.map((c) => {
                    const isSelected = (activeEntry?.id ?? activeChordId) === c.id
                    const chordCapoShape = capoFret > 0 ? chordShapeForCapo(c.symbol, capoFret, keyObj.accidental) : null

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveChordId(c.id)}
                        className={cn(
                          "min-w-[48px] h-9 sm:h-10 px-2.5 rounded-xl font-mono transition-all cursor-pointer shrink-0 touch-manipulation flex flex-col items-center justify-center",
                          isSelected
                            ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-105 ring-2 ring-amber-300 font-black"
                            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700/80 font-bold",
                        )}
                        aria-label={`View chord ${c.symbol} on fretboard`}
                      >
                        <span className="text-xs sm:text-sm leading-tight">{c.symbol}</span>
                        {chordCapoShape && (
                          <span className={cn("text-[9px] leading-none font-extrabold opacity-90", isSelected ? "text-black" : "text-amber-400")}>
                            ({chordCapoShape})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeIdx >= allChords.length - 1}
                  onClick={handleNextChord}
                  className="size-8 sm:size-9 p-0 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white shrink-0 touch-manipulation"
                  aria-label="Next chord in song"
                  title="Next chord"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* Touch Swipe Feedback Hint Bar */}
              <div className="flex items-center justify-center gap-1 text-[9px] font-mono font-bold text-zinc-300 pt-0.5">
                <span>👈 Swipe left / right to change chord 👉</span>
              </div>
            </div>

            {/* Fretboard Canvas Attached Directly Below Chord Buttons */}
            <div className="p-2.5 sm:p-4 bg-zinc-900/40">
              <GuitarFretboard chord={activeFretboardChord} capoFret={capoFret} concertSymbol={concertChord?.symbol} />
            </div>
          </div>
        </div>
      </div>

      {/* Solo Coach Panel */}
      <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/20 shrink-0 overflow-y-auto">
        <div className="flex-1 p-3 sm:p-6">
          <SoloCoach song={song} activeChord={concertChord} currentKey={keyObj} />
        </div>
      </div>
    </div>
  )
}

