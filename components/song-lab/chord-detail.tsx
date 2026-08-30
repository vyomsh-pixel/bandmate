"use client"

/**
 * BandMate — Chord detail panel.
 *
 * Shows the notes of the selected chord, a list of inversions (selectable), and
 * a button to hear the current voicing. Purely presentational over the theory
 * engine + audio engine.
 */

import { Play, Music2, Sparkles, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { midiToName } from "@/lib/music/notes"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { allInversions } from "@/lib/music/chords"
import type { Accidental, ParsedChord } from "@/lib/music/types"
import { Badge } from "@/components/ui/badge"

interface ChordDetailProps {
  chord: ParsedChord | null
  accidental: Accidental
  inversion: number
  onInversionChange: (inversion: number) => void
  onPlay: () => void
}

function getIntervalName(pc: number, rootPc: number): string {
  const diff = (pc - rootPc + 12) % 12
  switch (diff) {
    case 0: return "Root"
    case 1: return "Minor 2nd / b9"
    case 2: return "Major 2nd / 9th"
    case 3: return "Minor 3rd"
    case 4: return "Major 3rd"
    case 5: return "Perfect 4th / 11th"
    case 6: return "Dim 5th / #11"
    case 7: return "Perfect 5th"
    case 8: return "Aug 5th / b13"
    case 9: return "Major 6th / 13th"
    case 10: return "Minor 7th"
    case 11: return "Major 7th"
    default: return ""
  }
}

export function ChordDetail({ chord, accidental, inversion, onInversionChange, onPlay }: ChordDetailProps) {
  if (!chord || !chord.valid) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/40 border border-border/60 shadow-xs">
          <Music2 className="size-6 text-muted-foreground/60" aria-hidden="true" />
        </div>
        <div className="max-w-[220px]">
          <p className="text-sm font-bold text-foreground">No Chord Selected</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Click any chord slot in your timeline to inspect its voice leading and inversions.
          </p>
        </div>
      </div>
    )
  }

  const inversions = allInversions(chord, { octave: 4, accidental })
  const current = inversions[Math.min(inversion, inversions.length - 1)] ?? inversions[0]

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Hear Button */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 p-4.5 shadow-sm backdrop-blur-md">
        <div>
          <div className="font-mono text-3xl font-black tracking-tight text-foreground">{chord.symbol}</div>
          <div className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            {chord.qualityLabel}
          </div>
        </div>
        <Button
          size="sm"
          onClick={onPlay}
          className="h-10 gap-2 font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          aria-label={`Preview sound of ${chord.symbol}`}
        >
          <Volume2 className="size-4" aria-hidden="true" />
          <span>Hear</span>
        </Button>
      </div>

      {/* Notes of the current voicing */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Voicing Notes
        </span>
        <TooltipProvider delay={100}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {current?.notes.map((note, i) => {
              const intervalLabel = getIntervalName(note.pc, chord.rootPc)
              const isRoot = note.pc === chord.rootPc

              return (
                <Tooltip key={`${note.midi}-${i}`}>
                  <TooltipTrigger className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-background/60 p-2.5 text-center transition-all hover:border-primary/50 hover:bg-muted cursor-pointer shadow-xs">
                    <span className={cn("font-mono text-sm font-black", isRoot ? "text-primary" : "text-foreground")}>
                      {midiToName(note.midi, accidental)}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground truncate w-full mt-0.5">
                      {intervalLabel}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    MIDI {note.midi} · {intervalLabel}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Inversions Switcher */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Inversions
        </span>
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Chord inversions">
          {inversions.map((v) => {
            const isSelected = v.inversion === current?.inversion
            return (
              <button
                key={v.inversion}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onInversionChange(v.inversion)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 shadow-xs cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                    : "border-border/80 bg-background/50 hover:border-border hover:bg-card/80",
                )}
              >
                <div className="flex flex-col">
                  <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>
                    {v.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    {v.notes.map((n) => midiToName(n.midi, accidental)).join(" · ")}
                  </span>
                </div>
                {isSelected && (
                  <Badge variant="default" className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground">
                    Active
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
