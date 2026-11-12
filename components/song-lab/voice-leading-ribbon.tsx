"use client"

import { useMemo } from "react"
import { Sparkles, Activity, ShieldCheck, ArrowRight, Zap, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { midiToName } from "@/lib/music/notes"
import { parseChord } from "@/lib/music/chord-parser"
import {
  voiceChordInStyle,
  assignSATBVoices,
  analyzeVoiceLeadingStep,
  type VoicingStyle,
  type VoiceLeadingStep,
} from "@/lib/music/voice-leading"
import type { Accidental, ChordEntry, Note } from "@/lib/music/types"

interface VoiceLeadingRibbonProps {
  currentChord: ChordEntry | null
  nextChord: ChordEntry | null
  accidental?: Accidental
  voicingStyle?: VoicingStyle
  onAutoVoiceSection?: () => void
  isSectionVoiced?: boolean
}

export function VoiceLeadingRibbon({
  currentChord,
  nextChord,
  accidental = "sharp",
  voicingStyle = "close",
  onAutoVoiceSection,
  isSectionVoiced = false,
}: VoiceLeadingRibbonProps) {
  const analysis: VoiceLeadingStep | null = useMemo(() => {
    if (!currentChord || !nextChord) return null

    const fromParsed = parseChord(currentChord.symbol)
    const toParsed = parseChord(nextChord.symbol)
    if (!fromParsed.valid || !toParsed.valid) return null

    const fromNotes = voiceChordInStyle(fromParsed, voicingStyle, {
      octave: 4 + (currentChord.octaveOffset ?? 0),
      inversion: currentChord.inversion ?? 0,
      accidental,
    })

    const toNotes = voiceChordInStyle(toParsed, voicingStyle, {
      octave: 4 + (nextChord.octaveOffset ?? 0),
      inversion: nextChord.inversion ?? 0,
      accidental,
    })

    return analyzeVoiceLeadingStep(fromNotes, toNotes, currentChord.symbol, nextChord.symbol)
  }, [currentChord, nextChord, accidental, voicingStyle])

  if (!currentChord || !nextChord || !analysis) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 px-4 py-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-zinc-300">
              Harmonic Voice-Leading Matrix
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Select or play a chord in the progression to inspect voice glide paths
            </div>
          </div>
        </div>
        {onAutoVoiceSection && (
          <button
            type="button"
            onClick={onAutoVoiceSection}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Automatically minimize voice movement across all chords"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Smooth Voicings</span>
          </button>
        )}
      </div>
    )
  }

  const roleColors = {
    soprano: {
      text: "text-sky-400",
      bg: "bg-sky-500/15 border-sky-500/40",
      line: "stroke-sky-400",
      glow: "drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]",
    },
    alto: {
      text: "text-violet-400",
      bg: "bg-violet-500/15 border-violet-500/40",
      line: "stroke-violet-400",
      glow: "drop-shadow-[0_0_6px_rgba(167,139,250,0.5)]",
    },
    tenor: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/15 border-emerald-500/40",
      line: "stroke-emerald-400",
      glow: "drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]",
    },
    bass: {
      text: "text-amber-400",
      bg: "bg-amber-500/15 border-amber-500/40",
      line: "stroke-amber-400",
      glow: "drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]",
    },
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-3.5 sm:p-4 shadow-xl backdrop-blur-md select-none">
      {/* Top Header: Chords + Smoothness Score + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-sm sm:text-base font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
              {analysis.fromChord}
            </span>
            <ArrowRight className="size-3.5 text-zinc-500 shrink-0" />
            <span className="text-sm sm:text-base font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              {analysis.toChord}
            </span>
          </div>

          <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
            Voice Transition
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Smoothness Metric Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-xs font-bold border",
              analysis.smoothnessScore >= 75
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : analysis.smoothnessScore >= 45
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/40"
            )}
            title={`Total voice movement: ${analysis.totalDistance} semitones across 4 voices`}
          >
            <Zap className="size-3" />
            <span>{analysis.smoothnessScore}% Smooth Flow</span>
          </div>

          {onAutoVoiceSection && (
            <button
              type="button"
              onClick={onAutoVoiceSection}
              className="flex items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 hover:bg-amber-400/20 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Automatically optimize inversions across the section"
            >
              <Sparkles className="size-3 text-amber-400" />
              <span className="hidden sm:inline">Smooth Inversions</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Voice-Leading Ribbons (SATB) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
        {analysis.voices.map((v) => {
          const cfg = roleColors[v.voice]
          const isHeld = v.semitones === 0
          const directionSign = v.semitones > 0 ? `+${v.semitones}` : `${v.semitones}`

          return (
            <div
              key={v.voice}
              className={cn(
                "relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200",
                cfg.bg,
                isHeld ? "ring-1 ring-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]" : ""
              )}
            >
              {/* Voice Tag */}
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase font-black tracking-widest text-zinc-400">
                  {v.voice}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold mt-0.5">
                  <span className="text-zinc-200">
                    {midiToName(v.fromNote.midi, accidental)}
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span className={cn("font-black", cfg.text)}>
                    {midiToName(v.toNote.midi, accidental)}
                  </span>
                </div>
              </div>

              {/* Trajectory Badge */}
              <div className="flex flex-col items-end">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded font-mono text-[10px] font-black",
                    isHeld
                      ? "bg-amber-400 text-zinc-950 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                  )}
                  title={isHeld ? "Common tone held without voice leaping" : `Voice moves ${directionSign} semitones`}
                >
                  {isHeld ? "Held (Common)" : `${directionSign} st`}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tight mt-0.5">
                  {v.motion}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
