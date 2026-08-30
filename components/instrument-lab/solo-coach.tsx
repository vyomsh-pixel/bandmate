"use client"

import { useMemo } from "react"
import type { Song, ParsedChord, Key } from "@/lib/music/types"
import { scalePitchClasses, isInKey } from "@/lib/music/scales"
import { pcToName } from "@/lib/music/notes"
import { cn } from "@/lib/utils"
import { Target, ShieldCheck, Flame } from "lucide-react"

interface SoloCoachProps {
  song: Song
  activeChord: ParsedChord | null
  currentKey: Key
}

export function SoloCoach({ song, activeChord, currentKey }: SoloCoachProps) {
  const { targetNotes, safeNotes, spicyNotes } = useMemo(() => {
    if (!activeChord || !activeChord.valid) {
      return { targetNotes: [], safeNotes: [], spicyNotes: [] }
    }

    const keyScalePcs = new Set(scalePitchClasses(currentKey))
    const chordPcs = new Set(activeChord.intervals.map(i => (activeChord.rootPc + i) % 12))

    const targets: number[] = []
    const safes: number[] = []
    const spicys: number[] = []

    for (let i = 0; i < 12; i++) {
      if (chordPcs.has(i)) {
        targets.push(i) // Chord tones are target notes
      } else if (keyScalePcs.has(i)) {
        safes.push(i) // Diatonic non-chord tones are safe passing notes
      } else {
        // Non-diatonic, non-chord tones
        // For a rock/blues context, b3, b5, b7 often act as spicy blue notes.
        // For now, we'll classify all out-of-key notes as spicy/tension notes.
        spicys.push(i) 
      }
    }

    return { targetNotes: targets, safeNotes: safes, spicyNotes: spicys }
  }, [activeChord, currentKey])

  if (!activeChord || !activeChord.valid) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-8">
         <Flame className="w-8 h-8 opacity-20 mb-4" />
         <p>Select a chord in the progression to see soloing suggestions.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
         <h2 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Solo Coach
         </h2>
         <p className="text-sm text-muted-foreground">Target notes and scales for {activeChord.symbol}</p>
      </div>

      <div className="flex flex-col gap-6">
         {/* Target Notes */}
         <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
               <Target className="w-4 h-4 text-primary" />
               Target Notes (Chord Tones)
            </h3>
            <p className="text-xs text-muted-foreground mb-2">Land on these notes on the strong beats. They will always sound good.</p>
            <div className="flex flex-wrap gap-2">
               {targetNotes.map(pc => (
                 <span key={pc} className="px-3 py-1.5 rounded-md bg-primary/20 border border-primary/50 font-mono text-sm font-bold text-foreground">
                    {pcToName(pc, currentKey.accidental)}
                 </span>
               ))}
            </div>
         </div>

         {/* Safe Notes */}
         <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               Safe Passing Notes (Diatonic)
            </h3>
            <p className="text-xs text-muted-foreground mb-2">Use these to connect your target notes.</p>
            <div className="flex flex-wrap gap-2">
               {safeNotes.map(pc => (
                 <span key={pc} className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 font-mono text-sm text-foreground/80">
                    {pcToName(pc, currentKey.accidental)}
                 </span>
               ))}
            </div>
         </div>

         {/* Tension Notes */}
         <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
               <Flame className="w-4 h-4 text-orange-500" />
               Tension Notes (Outside)
            </h3>
            <p className="text-xs text-muted-foreground mb-2">Use sparingly as passing chromatic notes or bends to create tension.</p>
            <div className="flex flex-wrap gap-2">
               {spicyNotes.map(pc => (
                 <span key={pc} className="px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/30 font-mono text-xs text-muted-foreground">
                    {pcToName(pc, currentKey.accidental)}
                 </span>
               ))}
            </div>
         </div>
      </div>
    </div>
  )
}
