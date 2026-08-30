"use client"

/**
 * BandMate — Transport bar.
 *
 * Play / stop the progression, toggle loop + metronome, set BPM and master
 * volume, and show a live beat indicator. Drives the shared audio engine.
 */

import { useEffect, useState } from "react"
import { Play, Square, Repeat, Volume2, Volume1, VolumeX, Timer, Presentation, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface TransportBarProps {
  isPlaying: boolean
  bpm: number
  beatsPerBar: number
  currentBeat: number | null
  loop: boolean
  metronome: boolean
  volume: number
  onTogglePlay: () => void
  onBpmChange: (bpm: number) => void
  onToggleLoop: () => void
  onToggleMetronome: () => void
  onToggleRehearsal: () => void
  onVolumeChange: (v: number) => void
}

function BpmInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value.toString())

  useEffect(() => {
    setLocal(value.toString())
  }, [value])

  const commit = (val: number) => {
    const clamped = Math.max(30, Math.min(300, val))
    onChange(clamped)
    setLocal(clamped.toString())
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/50 p-1">
      <span className="px-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        BPM
      </span>
      <button
        type="button"
        onClick={() => commit(value - 5)}
        className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Decrease tempo by 5 BPM"
      >
        <Minus className="size-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const parsed = parseInt(local, 10)
          if (!isNaN(parsed)) commit(parsed)
          else setLocal(value.toString())
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur()
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            commit(value + (e.shiftKey ? 5 : 1))
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            commit(value - (e.shiftKey ? 5 : 1))
          }
        }}
        className="h-7 w-12 rounded bg-muted/40 text-center font-mono text-xs font-bold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        aria-label="Tempo in beats per minute"
      />
      <button
        type="button"
        onClick={() => commit(value + 5)}
        className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Increase tempo by 5 BPM"
      >
        <Plus className="size-3" />
      </button>
    </div>
  )
}

export function TransportBar({
  isPlaying,
  bpm,
  beatsPerBar,
  currentBeat,
  loop,
  metronome,
  volume,
  onTogglePlay,
  onBpmChange,
  onToggleLoop,
  onToggleMetronome,
  onToggleRehearsal,
  onVolumeChange,
}: TransportBarProps) {
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Island 1: Transport Core (Play/Stop, Beat Lights, Loop) */}
      <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/70 p-1.5 shadow-xs backdrop-blur-md">
        <Button
          onClick={onTogglePlay}
          size="lg"
          className={cn(
            "size-11 rounded-xl p-0 shadow-md transition-all duration-150 cursor-pointer",
            isPlaying
              ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-950/40 animate-pulse"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20",
          )}
          aria-label={isPlaying ? "Stop playback (Space)" : "Start playback (Space)"}
          title={isPlaying ? "Stop (Space)" : "Play (Space)"}
        >
          {isPlaying ? (
            <Square className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </Button>

        {/* LED Beat Bars */}
        <div
          className="flex h-11 w-32 items-center gap-1.5 rounded-xl border border-border/60 bg-background/50 p-2 shadow-inner"
          role="status"
          aria-label={isPlaying ? `Beat ${(currentBeat ?? 0) + 1} of ${beatsPerBar}` : "Playback stopped"}
        >
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const isCountIn = currentBeat !== null && currentBeat < 0
            const activeCountInBlock = isCountIn ? beatsPerBar + currentBeat : null
            const isActive = currentBeat === i || activeCountInBlock === i
            const isDownbeat = i === 0

            return (
              <div
                key={i}
                className={cn(
                  "h-full flex-1 rounded-sm transition-all duration-75 relative overflow-hidden",
                  isActive
                    ? isCountIn
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : isDownbeat
                        ? "bg-primary shadow-[0_0_12px_var(--color-primary)] ring-1 ring-white/50"
                        : "bg-primary/90 shadow-[0_0_8px_var(--color-primary)]"
                    : isDownbeat
                      ? "bg-muted-foreground/30"
                      : "bg-muted/50",
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                )}
              </div>
            )
          })}
        </div>

        {/* Loop Toggle */}
        <Button
          variant={loop ? "default" : "ghost"}
          size="sm"
          onClick={onToggleLoop}
          className={cn(
            "h-11 rounded-xl px-3 font-semibold text-xs transition-all",
            !loop && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          aria-pressed={loop}
          title="Toggle Loop Playback (L)"
        >
          <Repeat className="size-3.5" />
          <span className="hidden md:inline">Loop</span>
        </Button>
      </div>

      {/* Island 2: Tempo Section */}
      <div className="flex items-center rounded-2xl border border-border/80 bg-card/70 p-1.5 shadow-xs backdrop-blur-md">
        <BpmInput value={bpm} onChange={onBpmChange} />
      </div>

      {/* Island 3: Utilities (Metronome, Rehearsal, Volume) */}
      <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/70 p-1.5 shadow-xs backdrop-blur-md">
        {/* Metronome Click */}
        <Button
          variant={metronome ? "default" : "ghost"}
          size="sm"
          onClick={onToggleMetronome}
          className={cn(
            "h-10 rounded-xl px-3 text-xs font-semibold shadow-xs transition-all",
            !metronome && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          aria-pressed={metronome}
          title="Toggle Metronome Click (M)"
        >
          <Timer className="size-3.5" />
          <span className="hidden sm:inline">Click</span>
        </Button>

        {/* Fullscreen Rehearsal Mode */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRehearsal}
          className="h-10 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          title="Open Fullscreen Rehearsal Mode"
        >
          <Presentation className="size-3.5" />
          <span className="hidden sm:inline">Rehearse</span>
        </Button>

        <div className="h-6 w-px bg-border/80" />

        {/* Master Volume Slider */}
        <div className="flex items-center gap-2 px-2">
          <VolumeIcon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(v) => onVolumeChange(Array.isArray(v) ? v[0] : v)}
            className="w-16 sm:w-20"
            aria-label={`Master volume ${(volume * 100).toFixed(0)}%`}
          />
        </div>
      </div>
    </div>
  )
}
