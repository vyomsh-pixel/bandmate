"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { parseChord } from "@/lib/music/chord-parser"
import { voiceChordInStyle, assignSATBVoices, analyzeVoiceLeadingStep, type VoicingStyle } from "@/lib/music/voice-leading"
import type { ChordEntry, Accidental } from "@/lib/music/types"

interface VoiceRibbonProps {
  chords: ChordEntry[]
  selectedIndex: number
  voicingStyle?: VoicingStyle
  accidental?: Accidental
  onSelectIndex: (index: number) => void
  className?: string
}

const VOICE_COLORS = {
  soprano: {
    stroke: "#38bdf8", // Sky blue neon
    glow: "rgba(56, 189, 248, 0.45)",
    label: "Soprano (Melody)",
  },
  alto: {
    stroke: "#a78bfa", // Violet neon
    glow: "rgba(167, 139, 250, 0.45)",
    label: "Alto (Harmony)",
  },
  tenor: {
    stroke: "#34d399", // Emerald neon
    glow: "rgba(52, 211, 153, 0.45)",
    label: "Tenor (Inner)",
  },
  bass: {
    stroke: "#fbbf24", // Warm amber neon
    glow: "rgba(251, 191, 36, 0.55)",
    label: "Bass (Anchor)",
  },
}

export function VoiceRibbon({
  chords,
  selectedIndex,
  voicingStyle = "close",
  accidental = "sharp",
  onSelectIndex,
  className,
}: VoiceRibbonProps) {
  // Compute polyphonic voice trajectories across all chords
  const stepsData = useMemo(() => {
    if (chords.length === 0) return { chordVoices: [], steps: [], minMidi: 48, maxMidi: 72 }

    const chordVoices = chords.map((c) => {
      const parsed = parseChord(c.symbol)
      const notes = voiceChordInStyle(parsed, voicingStyle, {
        octave: 4,
        accidental,
        inversion: c.inversion ?? 0,
      })
      const satb = assignSATBVoices(notes)
      return {
        id: c.id,
        symbol: c.symbol,
        inversion: c.inversion ?? 0,
        satb,
      }
    })

    const steps = []
    for (let i = 0; i < chordVoices.length - 1; i++) {
      const cur = chordVoices[i]
      const next = chordVoices[i + 1]
      const step = analyzeVoiceLeadingStep(
        cur.satb.map((v) => v.note),
        next.satb.map((v) => v.note),
        cur.symbol,
        next.symbol,
      )
      steps.push(step)
    }

    let minMidi = 127
    let maxMidi = 0
    chordVoices.forEach((cv) => {
      cv.satb.forEach((v) => {
        if (v.note.midi < minMidi) minMidi = v.note.midi
        if (v.note.midi > maxMidi) maxMidi = v.note.midi
      })
    })

    if (minMidi === 127) {
      minMidi = 48
      maxMidi = 72
    } else {
      minMidi = Math.max(24, minMidi - 2)
      maxMidi = Math.min(108, maxMidi + 2)
    }

    return { chordVoices, steps, minMidi, maxMidi }
  }, [chords, voicingStyle, accidental])

  if (chords.length < 2) return null

  const width = Math.max(600, chords.length * 110)
  const height = 110
  const paddingX = 45
  const paddingY = 16
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingY * 2
  const colSpacing = usableWidth / (chords.length - 1)

  const getY = (midi: number) => {
    const range = Math.max(12, stepsData.maxMidi - stepsData.minMidi)
    const ratio = (midi - stepsData.minMidi) / range
    // Invert: higher pitch -> lower Y
    return height - paddingY - ratio * usableHeight
  }

  const voicesList: ("bass" | "tenor" | "alto" | "soprano")[] = ["soprano", "alto", "tenor", "bass"]

  return (
    <div className={cn("w-full overflow-x-auto no-scrollbar rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-2.5 backdrop-blur-md shadow-inner", className)}>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
            Voice-Flow Trajectory
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400">
            {voicingStyle.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span className="flex items-center gap-1 text-sky-400">
            <span className="size-1.5 rounded-full bg-sky-400" /> Soprano
          </span>
          <span className="flex items-center gap-1 text-violet-400">
            <span className="size-1.5 rounded-full bg-violet-400" /> Alto
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Tenor
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-400" /> Bass
          </span>
        </div>
      </div>

      <svg width={width} height={height} className="overflow-visible select-none">
        {/* Background grid lines for octaves */}
        <line x1={0} y1={paddingY} x2={width} y2={paddingY} stroke="#27272a" strokeDasharray="3 3" />
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#27272a" strokeDasharray="3 3" />
        <line x1={0} y1={height - paddingY} x2={width} y2={height - paddingY} stroke="#27272a" strokeDasharray="3 3" />

        {/* Vertical chord divider guidelines */}
        {chords.map((_, i) => {
          const x = paddingX + i * colSpacing
          const isSelected = i === selectedIndex
          return (
            <g key={`col-${i}`}>
              <line
                x1={x}
                y1={paddingY}
                x2={x}
                y2={height - paddingY}
                stroke={isSelected ? "#fbbf24" : "#27272a"}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeOpacity={isSelected ? 0.7 : 0.4}
              />
              {/* Selected highlight band */}
              {isSelected && (
                <rect
                  x={x - 22}
                  y={4}
                  width={44}
                  height={height - 8}
                  fill="rgba(251, 191, 36, 0.06)"
                  rx={6}
                />
              )}
            </g>
          )
        })}

        {/* Continuous bezier voice curves for each SATB voice */}
        {voicesList.map((voiceKey) => {
          const cfg = VOICE_COLORS[voiceKey]
          const points = stepsData.chordVoices.map((cv, i) => {
            const x = paddingX + i * colSpacing
            const noteObj = cv.satb.find((v) => v.voice === voiceKey)?.note
            const y = noteObj ? getY(noteObj.midi) : height / 2
            return { x, y, noteObj }
          })

          // Build SVG bezier path string
          let pathD = `M ${points[0].x} ${points[0].y}`
          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i]
            const p1 = points[i + 1]
            const cpX = (p0.x + p1.x) / 2
            pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`
          }

          return (
            <g key={`voice-path-${voiceKey}`}>
              {/* Glow filter line */}
              <path
                d={pathD}
                fill="none"
                stroke={cfg.glow}
                strokeWidth={5}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              {/* Crisp laser line */}
              <path
                d={pathD}
                fill="none"
                stroke={cfg.stroke}
                strokeWidth={2}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              {/* Voice contact nodes */}
              {points.map((p, idx) => (
                <circle
                  key={`node-${voiceKey}-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={idx === selectedIndex ? 4 : 2.5}
                  fill={cfg.stroke}
                  stroke="#09090b"
                  strokeWidth={1.5}
                  className="transition-transform duration-150 cursor-pointer"
                  onClick={() => onSelectIndex(idx)}
                />
              ))}
            </g>
          )
        })}

        {/* Chord symbol labels at the bottom of each column */}
        {stepsData.chordVoices.map((cv, i) => {
          const x = paddingX + i * colSpacing
          const isSelected = i === selectedIndex
          return (
            <text
              key={`chord-lbl-${i}`}
              x={x}
              y={height - 2}
              textAnchor="middle"
              className={cn(
                "text-[10px] font-mono font-bold cursor-pointer transition-colors duration-150",
                isSelected ? "fill-amber-400" : "fill-zinc-400 hover:fill-zinc-200"
              )}
              onClick={() => onSelectIndex(i)}
            >
              {cv.symbol}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
