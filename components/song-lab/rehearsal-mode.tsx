"use client"

import { useEffect, useRef } from "react"
import { X, Play, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Song } from "@/lib/music/types"

interface RehearsalModeProps {
  song: Song
  isPlaying: boolean
  activeIndex: number | null
  onTogglePlay: () => void
  onClose: () => void
}

export function RehearsalMode({ song, isPlaying, activeIndex, onTogglePlay, onClose }: RehearsalModeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card/80 p-4 backdrop-blur">
        <div>
           <h2 className="text-xl font-bold">{song.title}</h2>
           <div className="text-sm text-muted-foreground">{song.keyTonic} {song.keyMode} · {song.bpm} BPM</div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onTogglePlay}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? <Square className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            {isPlaying ? "STOP" : "START"}
          </button>
          
          <button 
            onClick={onClose}
            className="rounded-full p-3 text-muted-foreground hover:bg-muted"
          >
            <X className="size-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-8 lg:p-16">
        <div className="mx-auto max-w-5xl flex flex-col gap-12 pb-64">
          {song.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-6">
               <div className="text-lg font-bold tracking-widest text-primary/80 uppercase">
                 {section.name}
               </div>
               
               <div className="flex flex-wrap gap-6 lg:gap-8">
                 {section.chords.map((chord) => {
                   const isCurrent = activeIndex === globalIdx
                   const idx = globalIdx
                   globalIdx++
                   
                   return (
                     <div 
                       key={chord.id}
                       data-r-index={idx}
                       className={cn(
                         "flex min-h-[140px] min-w-[140px] flex-col items-center justify-center rounded-2xl border-4 p-4 transition-all duration-300",
                         isCurrent 
                           ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.3)] scale-105" 
                           : "border-border/50 bg-card/30"
                       )}
                     >
                        <span className={cn(
                          "text-5xl lg:text-7xl font-bold tracking-tighter",
                          isCurrent ? "text-primary" : "text-foreground"
                        )}>
                           {chord.symbol || "-"}
                        </span>
                        <span className="mt-2 text-sm font-mono text-muted-foreground font-semibold">
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
