"use client"

import { useMemo, useState } from "react"
import { GuitarFretboard } from "./guitar-fretboard"
import { SoloCoach } from "./solo-coach"
import type { Song } from "@/lib/music/types"
import { parseChord } from "@/lib/music/chord-parser"
import { makeKey } from "@/lib/music/scales"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col bg-card/40 min-w-0 overflow-y-auto">
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Guitar Workspace</h2>
            <p className="text-muted-foreground">Interactive fretboard, chord diagrams, and capo calculations for {song.title}.</p>
          </div>

          {/* Progression Chord Strip */}
          <div className="mb-6 rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Chord from Progression</h3>
              <Badge variant="outline" className="font-mono text-xs">{song.keyTonic} {song.keyMode}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {song.sections.map((section) => (
                <div key={section.id} className="flex items-center gap-1 rounded-lg bg-background/50 p-1 border border-border/50">
                  <span className="px-2 text-[11px] font-semibold text-muted-foreground uppercase">{section.name}</span>
                  {section.chords.map((c) => {
                    const isSelected = (activeEntry?.id ?? activeChordId) === c.id
                    return (
                      <Button
                        key={c.id}
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={`font-mono text-xs font-semibold ${isSelected ? "shadow-sm" : ""}`}
                        onClick={() => setActiveChordId(c.id)}
                      >
                        {c.symbol}
                      </Button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8 p-6 rounded-xl border border-border bg-card/80 backdrop-blur">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Current Chord Voicing</h3>
              <div className="font-mono text-2xl font-bold">{chord?.symbol || "-"}</div>
            </div>
            <GuitarFretboard chord={chord} />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/20 shrink-0 overflow-y-auto">
        <div className="flex-1 p-6">
          <SoloCoach song={song} activeChord={chord} currentKey={keyObj} />
        </div>
      </div>
    </div>
  )
}
