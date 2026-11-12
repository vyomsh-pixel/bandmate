"use client"

import { useMemo, useState, useEffect } from "react"
import { Volume2, Sparkles, Copy, Music2, Layers, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { allInversions, playableVoicing } from "@/lib/music/chords"
import { midiToName } from "@/lib/music/notes"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import {
  voiceChordInStyle,
  assignSATBVoices,
  type VoicingStyle,
} from "@/lib/music/voice-leading"
import type { Accidental, ParsedChord } from "@/lib/music/types"

function getIntervalName(pc: number, rootPc: number, isSlashBass: boolean): string {
  if (isSlashBass) return "Slash Bass"
  const semitones = ((pc - rootPc) % 12 + 12) % 12
  const map: Record<number, string> = {
    0: "Root",
    1: "Min 2nd / b9",
    2: "Maj 2nd / 9th",
    3: "Min 3rd",
    4: "Maj 3rd",
    5: "Perf 4th / 11th",
    6: "Tritone / #11",
    7: "Perf 5th",
    8: "Min 6th / b13",
    9: "Maj 6th / 13th",
    10: "Min 7th",
    11: "Maj 7th",
  }
  return map[semitones] ?? "Tone"
}

interface ChordDetailProps {
  chord: ParsedChord | null
  accidental: Accidental
  inversion: number
  onInversionChange: (inversion: number) => void
  onPlay?: () => void
  onDuplicate?: () => void
  voicingStyle?: VoicingStyle
  onVoicingStyleChange?: (style: VoicingStyle) => void
  octaveOffset?: number
  onOctaveOffsetChange?: (offset: number) => void
}

const VOICING_STYLES: { id: VoicingStyle; label: string; desc: string }[] = [
  { id: "close", label: "Close", desc: "Compact tight cluster" },
  { id: "drop2", label: "Drop-2", desc: "Warm jazz guitar & piano spread" },
  { id: "shell", label: "Shell", desc: "Root + 3rd + 7th guide tones" },
  { id: "open", label: "Open", desc: "Wide cinematic register spread" },
]

export function ChordDetail({
  chord,
  accidental,
  inversion,
  onInversionChange,
  onPlay,
  onDuplicate,
  voicingStyle = "close",
  onVoicingStyleChange,
  octaveOffset = 0,
  onOctaveOffsetChange,
}: ChordDetailProps) {
  const [activeStyle, setActiveStyle] = useState<VoicingStyle>(voicingStyle)

  useEffect(() => {
    setActiveStyle(voicingStyle)
  }, [voicingStyle])

  if (!chord || !chord.valid) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground select-none">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner">
          <Music2 className="size-7 text-amber-500/50" aria-hidden="true" />
        </div>
        <div className="max-w-[220px]">
          <p className="text-sm font-bold text-zinc-200">No Chord Selected</p>
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed font-mono">
            Click any MPC pad on the sequencer to audition voice-leading and inversions.
          </p>
        </div>
      </div>
    )
  }

  const effectiveOctave = Math.max(2, Math.min(6, 4 + (octaveOffset ?? 0)))
  const inversions = allInversions(chord, { octave: effectiveOctave, accidental })
  const safeInv = Math.min(inversion, Math.max(0, inversions.length - 1))
  const current = inversions[safeInv] ?? inversions[0]

  // Compute notes based on selected voicing style
  const styleNotes = voiceChordInStyle(chord, activeStyle, {
    octave: effectiveOctave,
    accidental,
    inversion: safeInv,
  })

  const satb = assignSATBVoices(styleNotes)

  const handlePlayVoice = (midi: number) => {
    const engine = getAudioEngine()
    engine.ensureContext().then(() => engine.playNote(midi, { duration: 1.25, velocity: 0.9 }))
  }

  const handlePlayAllVoicing = () => {
    const engine = getAudioEngine()
    engine.ensureContext().then(() => {
      engine.playChord(
        styleNotes.map((n) => n.midi),
        { duration: 1.6 },
      )
    })
  }

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Hardware-styled Chord Badge & Action Header */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 shadow-md">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black tracking-tight text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
              {chord.symbol}
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
              {chord.qualityLabel}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-500">
            Root: {chord.rootName} · Bass: {chord.bassName ?? chord.rootName}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDuplicate && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDuplicate}
              className="h-8 gap-1 font-mono text-xs font-bold border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
              title="Duplicate chord (D)"
            >
              <Copy className="size-3" />
              <span>Clone</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handlePlayAllVoicing}
            className="h-8 gap-1.5 font-mono text-xs font-bold bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-95 shadow-[0_0_12px_rgba(251,191,36,0.4)] cursor-pointer"
            aria-label={`Preview voicing of ${chord.symbol}`}
          >
            <Volume2 className="size-3.5" aria-hidden="true" />
            <span>Hear</span>
          </Button>
        </div>
      </div>

      {/* Voicing Style Selector (Close, Drop-2, Shell, Open) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Layers className="size-3.5 text-amber-400" />
            Voicing Architecture
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Polyphonic layout</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {VOICING_STYLES.map((st) => {
            const isSelected = activeStyle === st.id
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setActiveStyle(st.id)
                  onVoicingStyleChange?.(st.id)
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all duration-150 cursor-pointer shadow-xs",
                  isSelected
                    ? "border-amber-500 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                )}
                title={st.desc}
              >
                <span className="text-xs font-mono font-bold">{st.label}</span>
                <span className="text-[9px] font-mono text-zinc-500 mt-0.5 truncate w-full">
                  {st.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Octave Register Control */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Octave Register
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Harmonic pitch height</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[-1, 0, 1].map((offset) => {
            const isSelected = (octaveOffset ?? 0) === offset
            const labels = { "-1": "Low (C3)", "0": "Mid (C4)", "1": "High (C5)" }
            return (
              <button
                key={offset}
                type="button"
                onClick={() => onOctaveOffsetChange?.(offset)}
                className={cn(
                  "flex items-center justify-center py-1.5 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer",
                  isSelected
                    ? "border-amber-500 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/50"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <span>{labels[String(offset) as "-1" | "0" | "1"]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Voicing Notes & SATB Voice Assignment */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Voice Registers (SATB)
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Click voice to solo</span>
        </div>
        <TooltipProvider delay={100}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {satb.map((v, i) => {
              const isSlashBass = chord.bassPc !== null && v.note.pc === chord.bassPc
              const intervalLabel = getIntervalName(v.note.pc, chord.rootPc, isSlashBass)

              const roleColors = {
                soprano: "border-sky-500/50 text-sky-400 bg-sky-950/20",
                alto: "border-violet-500/50 text-violet-400 bg-violet-950/20",
                tenor: "border-emerald-500/50 text-emerald-400 bg-emerald-950/20",
                bass: "border-amber-500/50 text-amber-400 bg-amber-950/20",
              }[v.voice]

              return (
                <Tooltip key={`${v.voice}-${v.note.midi}-${i}`}>
                  <TooltipTrigger
                    onClick={() => handlePlayVoice(v.note.midi)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs",
                      roleColors
                    )}
                  >
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">
                      {v.voice}
                    </span>
                    <span className="font-mono text-sm font-black text-white mt-0.5">
                      {midiToName(v.note.midi, accidental)}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-zinc-400 mt-0.5 truncate px-1">
                      {intervalLabel}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-200">
                    Solo {v.voice.toUpperCase()} · MIDI {v.note.midi} · {intervalLabel}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Inversion Selector */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
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
                  "flex items-center justify-between rounded-xl border p-2.5 text-left transition-all duration-150 shadow-xs cursor-pointer",
                  isSelected
                    ? "border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/40 text-amber-300"
                    : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60"
                )}
              >
                <div className="flex flex-col">
                  <span className={cn("text-xs font-mono font-bold", isSelected ? "text-amber-400" : "text-zinc-200")}>
                    {v.label}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 mt-0.5">
                    {v.notes.map((n) => midiToName(n.midi, accidental)).join(" · ")}
                  </span>
                </div>
                {isSelected && (
                  <Badge className="text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500 text-zinc-950">
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
