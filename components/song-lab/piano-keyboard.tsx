"use client"

/**
 * BandMate — Real Piano visualizer.
 *
 * Professional 88-key interactive virtual keyboard.
 * Highlights active chord notes, the root note, and supports scrolling.
 */

import { useMemo, useRef, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { midiToPc, pcToName, midiToName } from "@/lib/music/notes"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import type { Accidental } from "@/lib/music/types"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PianoKeyboardProps {
  /** Lowest MIDI note to render. Default 21 (A0) for 88 keys. */
  startMidi?: number
  /** Highest MIDI note. Default 108 (C8) for 88 keys. */
  endMidi?: number
  /** MIDI notes to highlight from the current chord. */
  activeMidis: number[]
  /** MIDI note of the chord root (stronger highlight). */
  rootMidi?: number | null
  /** Optional separate MIDI note for slash bass. */
  bassMidi?: number | null
  accidental?: Accidental
}

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]
const BLACK_AFTER = new Set([0, 2, 5, 7, 9]) // white pcs that have a black key to their right

export function PianoKeyboard({
  startMidi = 21,
  endMidi = 108,
  activeMidis,
  rootMidi = null,
  bassMidi = null,
  accidental = "sharp",
}: PianoKeyboardProps) {
  const activeSet = useMemo(() => new Set(activeMidis), [activeMidis])
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Track pressed keys for computer keyboard input / mouse interaction
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set())

  const { whiteKeys, blackKeys } = useMemo(() => {
    const whites: { midi: number; label: string }[] = []
    for (let m = startMidi; m <= endMidi; m++) {
      if (WHITE_PCS.includes(midiToPc(m))) {
         whites.push({ midi: m, label: midiToName(m, accidental) })
      }
    }
    const blacks: { midi: number; leftIndex: number }[] = []
    whites.forEach((w, i) => {
      if (BLACK_AFTER.has(midiToPc(w.midi)) && w.midi + 1 <= endMidi && i < whites.length - 1) {
        blacks.push({ midi: w.midi + 1, leftIndex: i })
      }
    })
    return { whiteKeys: whites, blackKeys: blacks }
  }, [startMidi, endMidi, accidental])

  const preview = useCallback((midi: number) => {
    const engine = getAudioEngine()
    engine.ensureContext().then(() => engine.playNote(midi, { duration: 0.7 }))
  }, [])

  // Auto-scroll to the active notes if they are out of view, or middle C on mount
  useEffect(() => {
    if (scrollRef.current) {
       const targetMidi = activeMidis.length > 0 ? activeMidis[0] : 60
       const index = whiteKeys.findIndex((k) => k.midi >= targetMidi)
       if (index !== -1) {
          const ratio = index / whiteKeys.length
          const scrollWidth = scrollRef.current.scrollWidth
          const clientWidth = scrollRef.current.clientWidth
          const keyPos = scrollWidth * ratio
          const currentScroll = scrollRef.current.scrollLeft
          // Only scroll if out of view (with a 48px margin), avoiding jitter during playback
          if (keyPos < currentScroll + 48 || keyPos > currentScroll + clientWidth - 48) {
             const targetScroll = keyPos - (clientWidth / 2)
             scrollRef.current.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" })
          }
       }
    }
  }, [activeMidis, whiteKeys])

  const scrollByAmount = (dir: 1 | -1) => {
     if (scrollRef.current) {
        scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" })
     }
  }

  return (
    <div className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Virtual Piano
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            88-Keys
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollByAmount(-1)}
            className="h-7 w-7 p-0 border-border/80 bg-background/50 hover:bg-muted"
            aria-label="Scroll piano left"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (scrollRef.current) {
                const targetIndex = whiteKeys.findIndex((k) => k.midi >= 60)
                if (targetIndex !== -1) {
                  const ratio = targetIndex / whiteKeys.length
                  const targetScroll = scrollRef.current.scrollWidth * ratio - scrollRef.current.clientWidth / 2
                  scrollRef.current.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" })
                }
              }
            }}
            className="h-7 px-2 font-mono text-[10px] font-semibold border-border/80 bg-background/50 hover:bg-muted"
            aria-label="Center view on Middle C"
          >
            C4 Center
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollByAmount(1)}
            className="h-7 w-7 p-0 border-border/80 bg-background/50 hover:bg-muted"
            aria-label="Scroll piano right"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable container for 88 keys */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent rounded-xl border border-border/80 bg-background/40 p-1.5 shadow-inner"
        style={{ width: "100%" }}
      >
        <div className="relative h-[110px] select-none shrink-0" style={{ width: `${whiteKeys.length * 30}px` }}>
          {/* White keys */}
          <div className="absolute inset-0 flex gap-0.5">
            {whiteKeys.map((key) => {
              const isActive = activeSet.has(key.midi) || pressedKeys.has(key.midi)
              const isBass = bassMidi === key.midi
              const isRoot = !isBass && rootMidi === key.midi

              return (
                <button
                  key={key.midi}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    preview(key.midi)
                    setPressedKeys((prev) => new Set(prev).add(key.midi))
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    setPressedKeys((prev) => {
                      const n = new Set(prev)
                      n.delete(key.midi)
                      return n
                    })
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation()
                    setPressedKeys((prev) => {
                      const n = new Set(prev)
                      n.delete(key.midi)
                      return n
                    })
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    preview(key.midi)
                    setPressedKeys((prev) => new Set(prev).add(key.midi))
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    setPressedKeys((prev) => {
                      const n = new Set(prev)
                      n.delete(key.midi)
                      return n
                    })
                  }}
                  aria-label={`Play ${key.label}`}
                  className={cn(
                    "relative flex-1 rounded-b-md border border-black/30 border-t-0 transition-all duration-75 shadow-xs touch-manipulation",
                    "flex items-end justify-center pb-2 cursor-pointer",
                    isBass
                      ? "bg-emerald-400 text-black font-extrabold shadow-[0_0_15px_rgba(52,211,153,0.8)_inset]"
                      : isRoot
                        ? "bg-amber-400 text-black font-extrabold shadow-[0_0_15px_rgba(251,191,36,0.8)_inset]"
                        : isActive
                          ? "bg-amber-300 text-black font-bold shadow-[0_0_10px_rgba(252,211,77,0.5)_inset]"
                          : "bg-stone-200 hover:bg-stone-100 active:bg-stone-300 text-stone-700",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[10px] leading-none pointer-events-none",
                      isActive || isRoot || isBass ? "opacity-100 font-extrabold" : "opacity-60",
                    )}
                  >
                    {key.label}
                  </span>
                  {isBass ? (
                    <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-black bg-emerald-300 px-1 rounded-xs uppercase shadow-xs">
                      Bass
                    </span>
                  ) : isRoot ? (
                    <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-black bg-amber-200 px-1 rounded-xs uppercase">
                      Root
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Black keys */}
          <div className="pointer-events-none absolute inset-0">
            {blackKeys.map((key) => {
              const isActive = activeSet.has(key.midi) || pressedKeys.has(key.midi)
              const isBass = bassMidi === key.midi
              const isRoot = !isBass && rootMidi === key.midi
              const leftPct = ((key.leftIndex + 1) / whiteKeys.length) * 100
              const widthPct = (1 / whiteKeys.length) * 100

              return (
                <button
                  key={key.midi}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    preview(key.midi)
                    setPressedKeys((prev) => new Set(prev).add(key.midi))
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    setPressedKeys((prev) => {
                      const n = new Set(prev)
                      n.delete(key.midi)
                      return n
                    })
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation()
                    setPressedKeys((prev) => {
                      const n = new Set(prev)
                      n.delete(key.midi)
                      return n
                    })
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    preview(key.midi)
                    setPressedKeys((prev) => new Set(prev).add(key.midi))
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    setPressedKeys((prev) => {
                      const n = new Set(prev)
                      n.delete(key.midi)
                      return n
                    })
                  }}
                  aria-label={`Play ${pcToName(midiToPc(key.midi), accidental)}`}
                  className={cn(
                    "pointer-events-auto absolute top-0 h-[60%] rounded-b-md border border-black/90 transition-all duration-75 z-10 shadow-md cursor-pointer touch-manipulation",
                    isBass
                      ? "bg-emerald-400 text-black font-extrabold shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                      : isRoot
                        ? "bg-amber-400 text-black font-extrabold shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                        : isActive
                          ? "bg-amber-300 text-black font-bold shadow-[0_0_8px_rgba(252,211,77,0.7)]"
                          : "bg-stone-900 hover:bg-stone-800 active:bg-black",
                  )}
                  style={{
                    width: `${widthPct * 0.65}%`,
                    left: `${leftPct - widthPct * 0.325}%`,
                  }}
                >
                  {(isActive || isRoot || isBass) && (
                    <div className="absolute bottom-1 w-full text-center">
                      <span className="text-[9px] font-mono font-black text-black pointer-events-none">
                        {pcToName(midiToPc(key.midi), accidental)}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
