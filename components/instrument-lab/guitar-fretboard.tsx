"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { pcToName } from "@/lib/music/notes"
import type { ParsedChord } from "@/lib/music/types"
import { generateGuitarVoicings } from "@/lib/music/guitar-voicings"

interface GuitarFretboardProps {
  chord: ParsedChord | null
  frets?: number
}

// Standard tuning: E2, A2, D3, G3, B3, E4
const STRINGS = [
  { note: "e", midi: 64 },
  { note: "B", midi: 59 },
  { note: "G", midi: 55 },
  { note: "D", midi: 50 },
  { note: "A", midi: 45 },
  { note: "E", midi: 40 },
]

export function GuitarFretboard({ chord, frets = 15 }: GuitarFretboardProps) {
  const voicings = useMemo(() => {
    if (!chord || !chord.valid) return []
    return generateGuitarVoicings(chord)
  }, [chord])

  const [shapeIndex, setShapeIndex] = useState(0)
  
  // Ensure we don't go out of bounds if chord changes
  const activeVoicing = voicings[Math.min(shapeIndex, voicings.length - 1)]

  if (!chord || !chord.valid) {
    return <div className="text-muted-foreground text-sm py-8 text-center">Select a valid chord to see shapes.</div>
  }

  if (!activeVoicing) {
    return <div className="text-muted-foreground text-sm py-8 text-center">No shapes available for this chord.</div>
  }

  const baseFret = activeVoicing.baseFret
  const renderFrets = Math.max(5, baseFret + 4) // Show enough frets for the shape

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {activeVoicing.label}
        </div>
        
        {voicings.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShapeIndex(i => Math.max(0, i - 1))}
              disabled={shapeIndex === 0}
              className="p-1 hover:bg-muted rounded disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground">
              Shape {Math.min(shapeIndex + 1, voicings.length)} / {voicings.length}
            </span>
            <button
              onClick={() => setShapeIndex(i => Math.min(voicings.length - 1, i + 1))}
              disabled={shapeIndex >= voicings.length - 1}
              className="p-1 hover:bg-muted rounded disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto pb-4">
        <div className="min-w-[600px] flex flex-col gap-[2px] bg-border p-[2px] rounded-sm select-none">
          {STRINGS.map((string, stringIdx) => {
            const fretValue = activeVoicing.frets[5 - stringIdx] // 0 is low E in generator, so reverse
            
            return (
              <div key={stringIdx} className="flex h-8 bg-card">
                {/* Open string / Nut */}
                <div className="w-12 flex items-center justify-center border-r-4 border-r-muted-foreground/30 font-mono text-xs font-bold text-muted-foreground bg-muted/20 relative">
                  {fretValue === "X" && <span className="absolute left-1 text-destructive font-sans">✕</span>}
                  {fretValue === 0 && <span className="absolute left-1 text-primary font-sans">○</span>}
                  {string.note}
                </div>
                
                {/* Frets */}
                {Array.from({ length: renderFrets }).map((_, fretIdx) => {
                  const absoluteFret = fretIdx + 1
                  const isActive = fretValue === absoluteFret
                  const isRoot = isActive && (string.midi + absoluteFret) % 12 === chord.rootPc
                  
                  return (
                    <div 
                      key={fretIdx} 
                      className={cn(
                        "flex-1 border-r border-r-border flex items-center justify-center relative",
                        "before:absolute before:left-0 before:right-0 before:h-[2px] before:bg-muted-foreground/30 before:top-1/2 before:-translate-y-1/2"
                      )}
                    >
                      {stringIdx === 2 && [3, 5, 7, 9, 15].includes(absoluteFret) && (
                        <div className="absolute top-[150%] size-3 rounded-full bg-border -translate-y-1/2 pointer-events-none" />
                      )}
                      {stringIdx === 1 && absoluteFret === 12 && (
                        <div className="absolute top-[250%] size-3 rounded-full bg-border -translate-y-1/2 pointer-events-none" />
                      )}
                      {stringIdx === 4 && absoluteFret === 12 && (
                        <div className="absolute top-[50%] size-3 rounded-full bg-border -translate-y-1/2 pointer-events-none" />
                      )}

                      {/* Note dot */}
                      {isActive && (
                        <div 
                          className={cn(
                            "relative z-10 flex size-5 items-center justify-center rounded-full text-[9px] font-bold shadow-sm",
                            isRoot ? "bg-primary text-primary-foreground" : "bg-primary/30 text-foreground border border-primary/50"
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
        </div>
      </div>
    </div>
  )
}
