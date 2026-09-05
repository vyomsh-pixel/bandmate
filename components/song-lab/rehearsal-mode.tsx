"use client"

import { useState, useEffect, useRef } from "react"
import { X, Play, Square, Volume2, Volume1, VolumeX, Moon, Sun } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { Song } from "@/lib/music/types"

interface RehearsalModeProps {
  song: Song
  isPlaying: boolean
  activeIndex: number | null
  volume?: number
  onVolumeChange?: (v: number) => void
  onTogglePlay: () => void
  onClose: () => void
}

export function RehearsalMode({
  song,
  isPlaying,
  activeIndex,
  volume,
  onVolumeChange,
  onTogglePlay,
  onClose,
}: RehearsalModeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [oledMode, setOledMode] = useState(false)

  // Calculate flat chords array for mapping activeIndex
  const allChords = song.sections.flatMap(s => s.chords)

  // Auto-scroll to active chord
  useEffect(() => {
    if (activeIndex !== null && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-r-index="${activeIndex}"]`) as HTMLElement
      if (el) {
        // Scroll so it's roughly in the middle of the screen
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
    }
  }, [activeIndex])

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === " ") {
        e.preventDefault()
        onTogglePlay()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onTogglePlay])

  let globalIdx = 0

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col transition-colors duration-200", oledMode ? "bg-black text-white" : "bg-background text-foreground")}>
      {/* Header */}
      <div className={cn("flex items-center justify-between border-b px-3 sm:px-6 py-2.5 sm:py-4 backdrop-blur gap-2", oledMode ? "bg-black/90 border-zinc-800" : "bg-card/80 border-border")}>
        <div className="min-w-0">
           <h2 className="text-base sm:text-xl font-bold truncate">{song.title}</h2>
           <div className="text-xs sm:text-sm text-muted-foreground">{song.keyTonic} {song.keyMode} · {song.bpm} BPM</div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* OLED Mode Toggle */}
          <button
            type="button"
            onClick={() => setOledMode((v) => !v)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer", oledMode ? "border-amber-400 text-amber-300 bg-amber-400/10" : "border-border text-muted-foreground hover:text-foreground")}
            title="Toggle OLED Pure Black Stage Mode"
          >
            {oledMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            <span className="hidden sm:inline">{oledMode ? "OLED Stage ON" : "OLED Stage"}</span>
          </button>
          {onVolumeChange !== undefined && volume !== undefined && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => onVolumeChange(volume > 0 ? 0 : 0.85)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title={volume === 0 ? "Unmute" : "Mute (0%)"}
              >
                {volume === 0 ? (
                  <VolumeX className="size-4 text-destructive" />
                ) : volume < 0.5 ? (
                  <Volume1 className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(v) => onVolumeChange(Array.isArray(v) ? v[0] : v)}
                className="w-20 cursor-pointer"
                aria-label="Volume"
              />
              <span className="font-mono text-[11px] font-bold text-muted-foreground min-w-[28px]">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}

          <button 
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary px-4 sm:px-6 py-2 sm:py-3 font-bold text-xs sm:text-base text-primary-foreground hover:bg-primary/90 touch-manipulation cursor-pointer"
          >
            {isPlaying ? <Square className="size-4 sm:size-5 fill-current" /> : <Play className="size-4 sm:size-5 fill-current" />}
            {isPlaying ? "STOP" : "START"}
          </button>
          
          <button 
            onClick={onClose}
            className="rounded-full p-2 sm:p-3 text-muted-foreground hover:bg-muted touch-manipulation cursor-pointer"
            aria-label="Close rehearsal mode"
          >
            <X className="size-5 sm:size-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-16">
        <div className="mx-auto max-w-5xl flex flex-col gap-8 sm:gap-12 pb-64">
          {song.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-4 sm:gap-6">
               <div className="text-sm sm:text-lg font-bold tracking-widest text-primary/80 uppercase">
                 {section.name}
               </div>
               
               <div className="flex flex-wrap gap-3 sm:gap-6 lg:gap-8">
                 {section.chords.map((chord) => {
                   const isCurrent = activeIndex === globalIdx
                   const idx = globalIdx
                   globalIdx++
                   
                   return (
                     <div 
                       key={chord.id}
                       data-r-index={idx}
                       className={cn(
                         "flex min-h-[105px] min-w-[105px] sm:min-h-[140px] sm:min-w-[140px] flex-col items-center justify-center rounded-2xl border-2 sm:border-4 p-3 sm:p-4 transition-all duration-300",
                         isCurrent 
                           ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.3)] scale-105" 
                           : "border-border/50 bg-card/30"
                       )}
                     >
                        <span className={cn(
                          "text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tighter",
                          isCurrent ? "text-primary" : "text-foreground"
                        )}>
                           {chord.symbol || "-"}
                        </span>
                        <span className="mt-1 sm:mt-2 text-xs sm:text-sm font-mono text-muted-foreground font-semibold">
                          {chord.beats} BEATS
                        </span>
                     </div>
                   )
                 })}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
