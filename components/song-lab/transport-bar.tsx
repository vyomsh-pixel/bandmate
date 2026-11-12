"use client"

/**
 * BandMate — Tactile 21st.dev / Retro Synth Transport Console.
 *
 * Drives the audio engine with physical-style controls:
 * - Chunky MPC-style Play/Stop button with neon status ring
 * - Retro VFD illuminated beat LEDs & tape counter
 * - HardwareKnob rotary controls for master volume and tempo
 * - Quick tap-tempo engine and soundfont selector
 */

import { useState, useCallback, useRef } from "react"
import {
  Play,
  Square,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  Timer,
  Presentation,
  Plus,
  Minus,
  Sparkles,
  Activity,
  Sliders,
  Piano,
  Guitar,
  Zap,
  Loader2,
  Music,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HardwareKnob } from "@/components/ui/hardware-knob"
import { AudioVuMeter } from "@/components/ui/audio-vu-meter"
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

function renderInstIcon(icon: string) {
  if (icon === "piano") return <Piano className="size-3.5 text-amber-400 shrink-0" />
  if (icon === "guitar" || icon === "bass") return <Guitar className="size-3.5 text-amber-400 shrink-0" />
  if (icon === "strings" || icon === "brass") return <Music className="size-3.5 text-amber-400 shrink-0" />
  return <Zap className="size-3.5 text-amber-400 shrink-0" />
}

function renderRhythmIcon(key: string) {
  if (key === "pulse") return <Zap className="size-3.5 text-amber-400 shrink-0" />
  if (key === "pop") return <Guitar className="size-3.5 text-amber-400 shrink-0" />
  if (key === "arpeggio") return <Sparkles className="size-3.5 text-amber-400 shrink-0" />
  return <Activity className="size-3.5 text-amber-400 shrink-0" />
}

export const RHYTHM_PATTERNS = [
  { id: "pulse" as const, name: "Pulse (OneMotion)", iconKey: "pulse", description: "Rhythmic pulse on every beat" },
  { id: "sustain" as const, name: "Sustain (Hold)", iconKey: "sustain", description: "Single sustained chord per bar" },
  { id: "acoustic_strum" as const, name: "Acoustic Strum", iconKey: "pop", description: "Campfire D-DU-UDU 8th-note strumming" },
  { id: "pop" as const, name: "Bass & Offbeat", iconKey: "pop", description: "Bass on 1 & 3, syncopated chords" },
  { id: "arpeggio" as const, name: "Fingerpick Arp", iconKey: "arpeggio", description: "8th-note rolling Travis picking" },
  { id: "neosoul" as const, name: "Neo-Soul / Bossa", iconKey: "arpeggio", description: "Syncopated Rhodes & Nylon pocket" },
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
  const tapTimesRef = useRef<number[]>([])

  const handleToggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume)
      onVolumeChange?.(0)
    } else {
      onVolumeChange?.(prevVolume > 0 ? prevVolume : 0.85)
    }
  }, [volume, prevVolume, onVolumeChange])

  const handleTap = () => {
    const now = performance.now()
    const times = tapTimesRef.current
    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      tapTimesRef.current = [now]
      return
    }
    times.push(now)
    if (times.length > 4) times.shift()

    if (times.length >= 2) {
      const intervals = []
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculatedBpm = Math.max(40, Math.min(240, Math.round(60000 / avgInterval)))
      onBpmChange(calculatedBpm)
    }
  }

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const currentInst = AVAILABLE_INSTRUMENTS.find((i) => i.id === instrument) ?? AVAILABLE_INSTRUMENTS[0]
  const currentRhythm = RHYTHM_PATTERNS.find((p) => p.id === rhythm) ?? RHYTHM_PATTERNS[0]

  return (
    <div className="w-full select-none">
      {/* Mobile Bar */}
      <div className="flex md:hidden items-center justify-between gap-1.5 w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-1.5 shadow-md">
        <Button
          onClick={onTogglePlay}
          size="sm"
          className={cn(
            "size-9 rounded-lg p-0 shadow-md transition-all cursor-pointer shrink-0 font-bold",
            isPlaying
              ? "bg-rose-600 text-white animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
              : "bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-[0_0_12px_rgba(251,191,36,0.3)]",
          )}
          aria-label={isPlaying ? "Stop playback" : "Start playback"}
        >
          {isPlaying ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
        </Button>

        {/* LED Beat dots */}
        <div className="flex h-8 items-center gap-1.5 px-2 rounded-lg bg-black/60 border border-zinc-800 shrink-0">
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const isActive = currentBeat === i
            return (
              <div
                key={i}
                className={cn(
                  "size-2.5 rounded-full transition-all duration-75",
                  isActive
                    ? i === 0
                      ? "bg-amber-400 scale-125 shadow-[0_0_8px_#fbbf24]"
                      : "bg-amber-500 scale-110 shadow-[0_0_6px_#f59e0b]"
                    : "bg-zinc-800"
                )}
              />
            )
          })}
        </div>

        {/* Compact Tempo Display */}
        <div className="flex items-center gap-1 rounded-lg bg-black/60 border border-zinc-800 px-2 py-1 font-mono text-xs font-bold text-amber-400">
          <span>{bpm}</span>
          <span className="text-[9px] text-zinc-500 font-normal">BPM</span>
        </div>

        {/* Instrument selector */}
        <Select value={instrument} onValueChange={(val) => onInstrumentChange?.(val as InstrumentId)}>
          <SelectTrigger className="h-8 max-w-[120px] px-2 text-xs font-bold bg-zinc-900 border-zinc-800 rounded-lg text-zinc-200">
            <span className="truncate text-[11px]">{currentInst.name.split(" ")[0]}</span>
          </SelectTrigger>
          <SelectContent align="center" className="min-w-[240px] max-h-[300px] z-50 bg-zinc-950 border-zinc-800 text-zinc-200">
            {AVAILABLE_INSTRUMENTS.map((inst) => (
              <SelectItem key={inst.id} value={inst.id} className="cursor-pointer py-1.5">
                <span className="text-xs font-bold">{inst.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Hardware Console */}
      <div className="hidden md:flex items-center justify-between gap-3 w-full bg-gradient-to-b from-zinc-900 via-zinc-925 to-zinc-950 border border-zinc-800/90 rounded-2xl p-2 shadow-lg backdrop-blur-md">
        {/* Module 1: Transport Trigger & Beat LEDs */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-1.5 shadow-inner shrink-0">
          <Button
            onClick={onTogglePlay}
            size="sm"
            className={cn(
              "size-11 rounded-xl p-0 shadow-md transition-all duration-150 cursor-pointer shrink-0 font-black",
              isPlaying
                ? "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.6)] animate-pulse"
                : "bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:scale-105 active:scale-95",
            )}
            aria-label={isPlaying ? "Stop playback (Space)" : "Start playback (Space)"}
            title={isPlaying ? "Stop (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Square className="size-4 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
          </Button>

          {/* VFD Illuminated Beat Indicators */}
          <div
            className="flex h-9 w-28 items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#090a0d] px-2 shadow-inner"
            role="status"
            aria-label={isPlaying ? `Beat ${(currentBeat ?? 0) + 1} of ${beatsPerBar}` : "Playback stopped"}
          >
            {Array.from({ length: beatsPerBar }).map((_, i) => {
              const isActive = currentBeat === i
              const isDownbeat = i === 0

              return (
                <div
                  key={i}
                  className={cn(
                    "h-5 flex-1 rounded-sm transition-all duration-75 relative overflow-hidden flex items-center justify-center font-mono text-[9px] font-black",
                    isActive
                      ? isDownbeat
                        ? "bg-amber-400 text-zinc-950 shadow-[0_0_12px_#fbbf24] scale-105"
                        : "bg-amber-500 text-zinc-950 shadow-[0_0_8px_#f59e0b]"
                      : isDownbeat
                        ? "bg-zinc-800/80 text-zinc-600 border border-zinc-700/40"
                        : "bg-zinc-900 text-zinc-700 border border-zinc-800/50"
                  )}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>

          {/* Loop Button */}
          <Button
            variant={loop ? "default" : "ghost"}
            size="sm"
            onClick={onToggleLoop}
            className={cn(
              "h-9 rounded-lg px-2.5 font-mono text-xs font-bold transition-all cursor-pointer border",
              loop
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                : "border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            )}
            aria-pressed={loop}
            title="Toggle Loop Playback (L)"
          >
            <Repeat className="size-3.5 mr-1" />
            <span>LOOP</span>
          </Button>
        </div>

        {/* Module 2: Tactile Rotary BPM & Tap Console */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-1 shadow-inner shrink-0">
          <HardwareKnob
            value={bpm}
            min={40}
            max={240}
            step={1}
            label="TEMPO"
            unit=" BPM"
            onChange={onBpmChange}
            size="md"
            color="amber"
          />

          <button
            type="button"
            onClick={handleTap}
            className="flex flex-col items-center justify-center size-9 rounded-xl border border-amber-500/40 bg-gradient-to-b from-zinc-800 to-zinc-900 font-mono text-[9px] font-black text-amber-400 hover:bg-amber-500/20 active:scale-90 transition-all cursor-pointer shadow-xs select-none"
            title="Tap tempo rhythmically"
          >
            TAP
          </button>
        </div>

        {/* Module 3: Instrument & Rhythm Engine */}
        <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 shadow-inner shrink-0">
          {/* Instrument Selector */}
          <Select value={instrument} onValueChange={(val) => onInstrumentChange?.(val as InstrumentId)}>
            <SelectTrigger
              className="h-9 min-w-[160px] px-3 gap-2 font-mono text-xs font-bold bg-zinc-900 border-zinc-800 rounded-xl text-zinc-200 cursor-pointer hover:border-amber-500/50 transition-colors"
              aria-label="Select instrument sound"
            >
              {isInstrumentLoading ? (
                <Loader2 className="size-3.5 animate-spin text-amber-400 shrink-0" />
              ) : (
                renderInstIcon(currentInst.icon)
              )}
              <span className="truncate">{currentInst.name}</span>
            </SelectTrigger>
            <SelectContent align="center" className="min-w-[260px] max-h-[360px] z-50 bg-zinc-950 border-zinc-800 text-zinc-200">
              {AVAILABLE_INSTRUMENTS.map((inst) => (
                <SelectItem key={inst.id} value={inst.id} className="cursor-pointer py-2">
                  <div className="flex items-center gap-2">
                    {renderInstIcon(inst.icon)}
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-white">{inst.name}</span>
                      <span className="text-[10px] text-zinc-400">{inst.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Rhythm Style Selector */}
          <Select value={rhythm} onValueChange={(val) => onRhythmChange?.(val as RhythmPattern)}>
            <SelectTrigger
              className="h-9 px-2.5 gap-2 font-mono text-xs font-bold bg-zinc-900 border-zinc-800 rounded-xl text-zinc-200 cursor-pointer hover:border-amber-500/50 transition-colors"
              aria-label="Select playback rhythm style"
            >
              {renderRhythmIcon(currentRhythm.iconKey)}
              <span>{currentRhythm.name.split(" ")[0]}</span>
            </SelectTrigger>
            <SelectContent align="center" className="min-w-[200px] z-50 bg-zinc-950 border-zinc-800 text-zinc-200">
              {RHYTHM_PATTERNS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="cursor-pointer py-1.5">
                  <div className="flex items-center gap-2">
                    {renderRhythmIcon(p.iconKey)}
                    <span className="text-xs font-bold">{p.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Module 4: Hardware Master Volume Knob, VU Meter & Stage Mode */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-1 shadow-inner shrink-0">
          {/* Animated Stereo VU Meter */}
          <AudioVuMeter className="hidden xl:flex" />

          {/* Metronome */}
          <Button
            variant={metronome ? "default" : "ghost"}
            size="sm"
            onClick={onToggleMetronome}
            className={cn(
              "h-8 rounded-lg px-2 text-xs font-mono font-bold transition-all cursor-pointer border",
              metronome
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                : "border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            )}
            aria-pressed={metronome}
            title="Toggle Metronome Click (M)"
          >
            <Timer className="size-3.5" />
          </Button>

          {/* Fullscreen Rehearsal */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRehearsal}
            className="h-8 rounded-lg px-2 text-xs font-mono font-bold text-zinc-400 border border-zinc-800 hover:bg-zinc-900 hover:text-white cursor-pointer"
            title="Open Fullscreen Stage Mode"
          >
            <Presentation className="size-3.5" />
          </Button>

          {/* Master Volume Rotary Knob */}
          <HardwareKnob
            value={Math.round(volume * 100)}
            min={0}
            max={100}
            step={1}
            label="MASTER"
            unit="%"
            onChange={(val) => onVolumeChange?.(val / 100)}
            size="md"
            color="amber"
          />

          <button
            type="button"
            onClick={handleToggleMute}
            className={cn(
              "rounded-lg p-1.5 transition-colors cursor-pointer border",
              volume === 0
                ? "text-rose-400 border-rose-500/40 bg-rose-950/30 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                : "text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white"
            )}
            title={volume === 0 ? "Unmute" : "Mute"}
            aria-label={volume === 0 ? "Unmute sound" : "Mute sound"}
          >
            <VolumeIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
