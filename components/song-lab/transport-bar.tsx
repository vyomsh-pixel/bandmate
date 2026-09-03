"use client"

/**
 * BandMate — Transport bar.
 *
 * Play / stop the progression, toggle loop + metronome, set BPM and master
 * volume, and show a live beat indicator. Drives the shared audio engine.
 */

import { useEffect, useState, useCallback } from "react"
import { Play, Square, Repeat, Volume2, Volume1, VolumeX, Timer, Presentation, Plus, Minus, Sparkles, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { AVAILABLE_INSTRUMENTS, type InstrumentId } from "@/lib/audio/soundfont-engine"
import type { RhythmPattern } from "@/lib/audio/audio-engine"
import { cn } from "@/lib/utils"

export const RHYTHM_PATTERNS = [
  { id: "pulse" as const, name: "Pulse (OneMotion)", icon: "⚡", description: "Rhythmic pulse on every beat" },
  { id: "sustain" as const, name: "Sustain (Hold)", icon: "〰️", description: "Single sustained chord per bar" },
  { id: "pop" as const, name: "Bass & Strum", icon: "🎸", description: "Bass on beat 1, chords on offbeats" },
  { id: "arpeggio" as const, name: "Arpeggiator", icon: "✨", description: "Rolling chord notes in sequence" },
]

interface TransportBarProps {
  isPlaying: boolean
  bpm: number
  beatsPerBar: number
  currentBeat: number | null
  loop: boolean
  metronome: boolean
  volume: number
  instrument?: InstrumentId
  isInstrumentLoading?: boolean
  rhythm?: RhythmPattern
  onTogglePlay: () => void
  onBpmChange: (bpm: number) => void
  onToggleLoop: () => void
  onToggleMetronome: () => void
  onToggleRehearsal: () => void
  onVolumeChange?: (volume: number) => void
  onInstrumentChange?: (id: InstrumentId) => void
  onRhythmChange?: (pattern: RhythmPattern) => void
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
  instrument = "acoustic_grand_piano",
  isInstrumentLoading = false,
  rhythm = "pulse",
  onTogglePlay,
  onBpmChange,
  onToggleLoop,
  onToggleMetronome,
  onToggleRehearsal,
  onVolumeChange,
  onInstrumentChange,
  onRhythmChange,
}: TransportBarProps) {
  const [prevVolume, setPrevVolume] = useState(0.85)

  const handleToggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume)
      onVolumeChange(0)
    } else {
      onVolumeChange?.(prevVolume > 0 ? prevVolume : 0.85)
    }
  }, [volume, prevVolume, onVolumeChange])

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const currentInst = AVAILABLE_INSTRUMENTS.find((i) => i.id === instrument) ?? AVAILABLE_INSTRUMENTS[0]
  const currentRhythm = RHYTHM_PATTERNS.find((p) => p.id === rhythm) ?? RHYTHM_PATTERNS[0]

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 md:gap-2 w-full">
      {/* Tier 1: Transport Core, Tempo & Mobile Volume */}
      <div className="flex items-center justify-between gap-1.5 w-full md:w-auto shrink-0">
        {/* Island 1: Transport Core (Play/Stop, Beat Lights, Loop) */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          <Button
            onClick={onTogglePlay}
            size="sm"
            className={cn(
              "size-8.5 rounded-lg p-0 shadow-md transition-all duration-150 cursor-pointer",
              isPlaying
                ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-950/40 animate-pulse"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20",
            )}
            aria-label={isPlaying ? "Stop playback (Space)" : "Start playback (Space)"}
            title={isPlaying ? "Stop (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <Play className="size-3.5 fill-current ml-0.5" />
            )}
          </Button>

          {/* LED Beat Bars */}
          <div
            className="flex h-8.5 w-12 sm:w-20 md:w-24 items-center gap-0.5 sm:gap-1 rounded-lg border border-border/60 bg-background/50 p-1 shadow-inner"
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
                    "h-full flex-1 rounded-xs transition-all duration-75 relative overflow-hidden",
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
              "h-8.5 rounded-lg px-2 sm:px-2.5 font-bold text-xs transition-all cursor-pointer",
              !loop && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={loop}
            title="Toggle Loop Playback (L)"
          >
            <Repeat className="size-3.5" />
            <span className="hidden xl:inline text-[11px]">Loop</span>
          </Button>
        </div>

        {/* Island 2: Tempo Section */}
        <div className="flex items-center rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          <BpmInput value={bpm} onChange={onBpmChange} />
        </div>

        {/* Mobile Volume Pill & Quick Preset (< md) */}
        <div className="flex md:hidden items-center gap-1 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer",
              volume === 0
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={volume === 0 ? "Unmute sound" : "Mute sound"}
          >
            <VolumeIcon className="size-3.5 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (volume >= 0.95) onVolumeChange?.(0.55)
              else if (volume >= 0.8) onVolumeChange?.(1.0)
              else if (volume >= 0.4) onVolumeChange?.(0)
              else onVolumeChange?.(0.85)
            }}
            className={cn(
              "font-mono text-[10px] font-bold px-1.5 py-1 rounded-md border min-w-[32px] text-center transition-all cursor-pointer select-none",
              volume === 0
                ? "border-destructive/40 bg-destructive/10 text-destructive font-black"
                : volume >= 0.85
                  ? "border-primary/40 bg-primary/10 text-primary font-black"
                  : "border-border/80 bg-background/60 text-muted-foreground"
            )}
          >
            {volume === 0 ? "0%" : `${Math.round(volume * 100)}%`}
          </button>
        </div>
      </div>

      {/* Tier 2: Sound Palette, Groove & Utilities */}
      <div className="flex items-center justify-between md:justify-end gap-1.5 w-full md:w-auto shrink-0">
        {/* Island 3: Real Acoustic Instrument & Rhythm Pattern */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md flex-1 md:flex-initial">
          {/* Instrument Dropdown */}
          <Select value={instrument} onValueChange={(val) => onInstrumentChange?.(val as InstrumentId)}>
            <SelectTrigger
              className="h-8.5 flex-1 md:w-auto max-w-none px-2 sm:px-2.5 gap-1.5 font-bold text-xs bg-background/50 border-border/80 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              aria-label="Select instrument sound"
            >
              {isInstrumentLoading ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <span>{currentInst.icon}</span>
              )}
              <span className="truncate">{currentInst.name}</span>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-[270px] max-h-[380px] z-50">
              {AVAILABLE_INSTRUMENTS.map((inst) => (
                <SelectItem key={inst.id} value={inst.id} className="cursor-pointer py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base shrink-0">{inst.icon}</span>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{inst.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase px-1 py-0.2 rounded bg-muted/60">
                          {inst.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{inst.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Playback Rhythm Pattern */}
          <Select value={rhythm} onValueChange={(val) => onRhythmChange?.(val as RhythmPattern)}>
            <SelectTrigger
              className="h-8.5 w-auto px-2 sm:px-2.5 gap-1.5 font-bold text-xs bg-background/50 border-border/80 rounded-lg cursor-pointer hover:border-primary/50 transition-colors shrink-0"
              aria-label="Select playback rhythm style"
              title="Playback Rhythm Style (OneMotion Pulse, Sustain, etc.)"
            >
              <span>{currentRhythm.icon}</span>
              <span className="hidden sm:inline">{currentRhythm.name}</span>
            </SelectTrigger>
            <SelectContent align="center" className="min-w-[210px] z-50">
              {RHYTHM_PATTERNS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="cursor-pointer py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.icon}</span>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-foreground">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">{p.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Island 4: Utilities (Metronome, Rehearsal, Desktop Volume) */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          {/* Metronome Click */}
          <Button
            variant={metronome ? "default" : "ghost"}
            size="sm"
            onClick={onToggleMetronome}
            className={cn(
              "h-8.5 rounded-lg px-2 sm:px-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer",
              !metronome && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={metronome}
            title="Toggle Metronome Click (M)"
          >
            <Timer className="size-3.5" />
            <span className="hidden lg:inline text-[11px]">Click</span>
          </Button>

          {/* Fullscreen Rehearsal Mode */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRehearsal}
            className="h-8.5 rounded-lg px-2 sm:px-2.5 text-xs font-bold text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer"
            title="Open Fullscreen Rehearsal Mode"
          >
            <Presentation className="size-3.5" />
            <span className="hidden lg:inline text-[11px]">Rehearse</span>
          </Button>

          {/* Desktop Master Volume Controller (>= md) */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-0.5 border-l border-border/80 ml-0.5">
            <button
              type="button"
              onClick={handleToggleMute}
              className={cn(
                "rounded-md p-1.5 transition-colors cursor-pointer",
                volume === 0
                  ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
              title={volume === 0 ? "Unmute sound" : "Mute sound (0%)"}
              aria-label={volume === 0 ? "Unmute sound" : "Mute sound"}
            >
              <VolumeIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </button>

            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(v) => onVolumeChange?.(Array.isArray(v) ? v[0] : v)}
              className="w-16 sm:w-20 md:w-24 cursor-pointer"
              aria-label={`Master volume ${(volume * 100).toFixed(0)}%`}
            />

            {/* Live Volume Percentage Pill & Preset Cycler */}
            <button
              type="button"
              onClick={() => {
                if (volume >= 0.95) onVolumeChange?.(0.55)
                else if (volume >= 0.8) onVolumeChange?.(1.0)
                else if (volume >= 0.4) onVolumeChange?.(0)
                else onVolumeChange?.(0.85)
              }}
              className={cn(
                "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md border min-w-[34px] text-center transition-all hover:scale-105 active:scale-95 cursor-pointer select-none",
                volume === 0
                  ? "border-destructive/40 bg-destructive/10 text-destructive font-black"
                  : volume >= 0.85
                    ? "border-primary/40 bg-primary/10 text-primary font-black"
                    : "border-border/80 bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="Click to cycle presets: 85% (Base) -> 100% (Loud) -> 55% (Emotional) -> 0% (Silent)"
            >
              {volume === 0 ? "0%" : `${Math.round(volume * 100)}%`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
