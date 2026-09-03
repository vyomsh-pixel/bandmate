"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Music } from "lucide-react"
import { GuitarFretboard } from "./guitar-fretboard"
import { SoloCoach } from "./solo-coach"
import type { Song } from "@/lib/music/types"
import { parseChord } from "@/lib/music/chord-parser"
import { makeKey } from "@/lib/music/scales"
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

  // Ensure selection remains valid when song changes
  const activeEntry = allChords.find((c) => c.id === activeChordId) ?? allChords[0] ?? null
  const chord = activeEntry ? parseChord(activeEntry.symbol) : null
  const keyObj = makeKey(song.keyTonic, song.keyMode)

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

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col bg-card/40 min-w-0 overflow-y-auto">
        <div className="flex-1 p-2.5 sm:p-5 flex flex-col gap-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎸</span>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-white">Guitar Workspace</h2>
            </div>
            <Badge variant="outline" className="font-mono text-xs text-amber-400 border-amber-400/40 bg-amber-400/10">
              {song.keyTonic} {song.keyMode}
            </Badge>
          </div>

          {/* UNIFIED HERO CARD: CHORD SELECTOR + FRETBOARD IN ONE SCREEN VIEW (ZERO SCROLL) */}
          <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden shrink-0">
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
                  className="size-8 sm:size-9 p-0 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white shrink-0"
                  aria-label="Previous chord in song"
                  title="Previous chord"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 justify-center py-0.5">
                  {currentSection?.chords.map((c, i) => {
                    const isSelected = (activeEntry?.id ?? activeChordId) === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveChordId(c.id)}
                        className={cn(
                          "min-w-[44px] h-9 sm:h-10 px-3 rounded-xl font-mono text-sm sm:text-base font-black transition-all cursor-pointer shrink-0 touch-manipulation",
                          isSelected
                            ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-105 ring-2 ring-amber-300"
                            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700/80",
                        )}
                        aria-label={`View chord ${c.symbol} on fretboard`}
                      >
                        {c.symbol}
                      </button>
                    )
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeIdx >= allChords.length - 1}
                  onClick={handleNextChord}
                  className="size-8 sm:size-9 p-0 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white shrink-0"
                  aria-label="Next chord in song"
                  title="Next chord"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Fretboard Canvas Attached Directly Below Chord Buttons */}
            <div className="p-2.5 sm:p-4 bg-zinc-900/40">
              <GuitarFretboard chord={chord} />
            </div>
          </div>
        </div>
      </div>

      {/* Solo Coach Panel */}
      <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/20 shrink-0 overflow-y-auto">
        <div className="flex-1 p-3 sm:p-6">
          <SoloCoach song={song} activeChord={chord} currentKey={keyObj} />
        </div>
      </div>
    </div>
  )
}
