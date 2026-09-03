"use client"

/**
 * BandMate — Transport bar.
 *
 * Play / stop the progression, toggle loop + metronome, set BPM and master
 * volume, and show a live beat indicator. Drives the shared audio engine.
 */

import { useEffect, useState, useCallback } from "react"
import { Play, Square, Repeat, Volume2, Volume1, VolumeX, Timer, Presentation, Plus, Minus, Sparkles, Activity, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    <div className="w-full">
      {/* ========================================================================= */}
      {/* MOBILE-ONLY SLIM TRANSPORT BAR (< md) — ZERO CLUTTER, 42PX SLIM           */}
      {/* ========================================================================= */}
      <div className="flex md:hidden items-center justify-between gap-1.5 w-full bg-card/70 border border-border/80 rounded-xl p-1 shadow-xs backdrop-blur-md">
        {/* Play/Stop button */}
        <Button
          onClick={onTogglePlay}
          size="sm"
          className={cn(
            "size-8 rounded-lg p-0 shadow-xs transition-all cursor-pointer shrink-0",
            isPlaying
              ? "bg-rose-600 text-white animate-pulse shadow-rose-950/40"
              : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black shadow-md shadow-emerald-950/30",
          )}
          aria-label={isPlaying ? "Stop playback" : "Start playback"}
        >
          {isPlaying ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
        </Button>

        {/* 4 Beat Dots */}
        <div
          className="flex h-8 items-center gap-1 px-1.5 rounded-lg bg-background/50 border border-border/60 shrink-0"
          role="status"
          aria-label={isPlaying ? `Beat ${(currentBeat ?? 0) + 1} of ${beatsPerBar}` : "Stopped"}
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
                  "size-2 rounded-full transition-all duration-75",
                  isActive
                    ? isDownbeat
                      ? "bg-primary scale-125 shadow-[0_0_8px_var(--color-primary)]"
                      : "bg-amber-400 scale-110 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                    : isDownbeat
                      ? "bg-muted-foreground/50"
                      : "bg-muted-foreground/25",
                )}
              />
            )
          })}
        </div>

        {/* Compact BPM Stepper */}
        <div className="flex items-center rounded-lg bg-background/50 border border-border/60 px-1 py-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onBpmChange(Math.max(40, bpm - 5))}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground text-xs font-bold active:scale-90 cursor-pointer"
            aria-label="Decrease BPM"
          >
            -
          </button>
          <span className="font-mono text-xs font-black px-1 min-w-[28px] text-center tabular-nums text-foreground">
            {bpm}
          </span>
          <button
            type="button"
            onClick={() => onBpmChange(Math.min(240, bpm + 5))}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground text-xs font-bold active:scale-90 cursor-pointer"
            aria-label="Increase BPM"
          >
            +
          </button>
        </div>

        {/* Compact Instrument Dropdown */}
        <Select value={instrument} onValueChange={(val) => onInstrumentChange?.(val as InstrumentId)}>
          <SelectTrigger className="h-8 flex-1 min-w-0 max-w-[125px] px-2 gap-1 text-xs font-bold bg-background/50 border-border/60 rounded-lg cursor-pointer">
            {isInstrumentLoading ? <span className="animate-spin text-xs">⏳</span> : <span>{currentInst.icon}</span>}
            <span className="truncate text-[11px] font-medium">
              {currentInst.name.replace("Concert ", "").replace(" Vintage", "")}
            </span>
          </SelectTrigger>
          <SelectContent align="center" className="min-w-[260px] max-h-[380px] z-50">
            {AVAILABLE_INSTRUMENTS.map((inst) => (
              <SelectItem key={inst.id} value={inst.id} className="cursor-pointer py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{inst.icon}</span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold">{inst.name}</span>
                    <span className="text-[10px] text-muted-foreground">{inst.description}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quick Audio & Stage Settings Popover (🎛️) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="size-8 flex items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer shrink-0 shadow-xs transition-colors"
              title="Groove, Metronome, Volume & Stage"
              aria-label="Audio controls"
            >
              <Sliders className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-3 space-y-3 z-50">
            {/* Master Volume */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Master Volume
                </span>
                <span className="font-mono text-xs font-bold text-primary">{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={cn("p-1 rounded cursor-pointer", volume === 0 ? "text-destructive" : "text-muted-foreground")}
                  title={volume === 0 ? "Unmute" : "Mute"}
                >
                  <VolumeIcon className="size-4" />
                </button>
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => onVolumeChange?.(Array.isArray(v) ? v[0] : v)}
                  className="flex-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Actions Grid: Loop, Click, Stage */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={onToggleLoop}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-center cursor-pointer transition-all",
                  loop ? "bg-primary/20 border-primary text-primary font-bold shadow-xs" : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <Repeat className="size-3.5" />
                <span className="text-[9px] font-mono">Loop</span>
              </button>

              <button
                type="button"
                onClick={onToggleMetronome}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-center cursor-pointer transition-all",
                  metronome ? "bg-primary/20 border-primary text-primary font-bold shadow-xs" : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <Timer className="size-3.5" />
                <span className="text-[9px] font-mono">Click</span>
              </button>

              <button
                type="button"
                onClick={onToggleRehearsal}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted text-center cursor-pointer transition-all"
              >
                <Presentation className="size-3.5" />
                <span className="text-[9px] font-mono">Stage</span>
              </button>
            </div>

            {/* Rhythm Pattern Selector */}
            <div className="pt-2 border-t border-border/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Playback Style
              </span>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                {RHYTHM_PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onRhythmChange?.(p.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 p-1.5 rounded-lg border text-left cursor-pointer transition-all",
                      rhythm === p.id ? "bg-primary/20 border-primary text-primary font-bold" : "border-border/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span>{p.icon}</span>
                    <span className="truncate">{p.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP-ONLY TRANSPORT BAR (>= md) — 4 ISLAND PRO AUDIO STRIP             */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between gap-2 w-full overflow-x-auto no-scrollbar">
        {/* Island 1: Transport Core (Play/Stop, Beat Lights, Loop) */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          <Button
            onClick={onTogglePlay}
            size="sm"
            className={cn(
              "size-8.5 rounded-lg p-0 shadow-md transition-all duration-150 cursor-pointer",
              isPlaying
                ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-950/40 animate-pulse"
                : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black shadow-md shadow-emerald-950/30",
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
            className="flex h-8.5 w-14 sm:w-24 items-center gap-0.5 sm:gap-1 rounded-lg border border-border/60 bg-background/50 p-1 sm:p-1.5 shadow-inner"
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

        {/* Island 3: Real Acoustic Instrument & Rhythm Pattern */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          {/* Instrument Dropdown */}
          <Select value={instrument} onValueChange={(val) => onInstrumentChange?.(val as InstrumentId)}>
            <SelectTrigger
              className="h-8.5 w-auto max-w-[125px] sm:max-w-none px-2 sm:px-2.5 gap-1.5 font-bold text-xs bg-background/50 border-border/80 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              aria-label="Select instrument sound"
            >
              {isInstrumentLoading ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <span>{currentInst.icon}</span>
              )}
              <span className="hidden sm:inline">{currentInst.name}</span>
              <span className="sm:hidden text-[11px] truncate">{currentInst.name.split(" ")[0]}</span>
            </SelectTrigger>
            <SelectContent align="center" className="min-w-[270px] max-h-[380px] z-50">
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
              className="h-8.5 w-auto px-2 sm:px-2.5 gap-1.5 font-bold text-xs bg-background/50 border-border/80 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              aria-label="Select playback rhythm style"
              title="Playback Rhythm Style (OneMotion Pulse, Sustain, etc.)"
            >
              <span>{currentRhythm.icon}</span>
              <span className="hidden md:inline">{currentRhythm.name}</span>
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

        {/* Island 4: Utilities (Metronome, Rehearsal, Volume) */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/70 p-1 shadow-xs backdrop-blur-md shrink-0">
          {/* Metronome Click */}
          <Button
            variant={metronome ? "default" : "ghost"}
            size="sm"
            onClick={onToggleMetronome}
            className={cn(
              "h-8.5 rounded-lg px-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer",
              !metronome && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={metronome}
            title="Toggle Metronome Click (M)"
          >
            <Timer className="size-3.5" />
            <span className="hidden md:inline text-[11px]">Click</span>
          </Button>

          {/* Fullscreen Rehearsal Mode */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRehearsal}
            className="h-8.5 rounded-lg px-2.5 text-xs font-bold text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer"
            title="Open Fullscreen Rehearsal Mode"
          >
            <Presentation className="size-3.5" />
            <span className="hidden md:inline text-[11px]">Rehearse</span>
          </Button>

          <div className="h-5 w-px bg-border/80" />

          {/* Master Volume Controller */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-0.5">
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
