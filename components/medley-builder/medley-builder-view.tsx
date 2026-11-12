"use client"

import { useState, useMemo } from "react"
import {
  Sparkles,
  ArrowRight,
  Play,
  Merge,
  Layers,
  Music,
  Zap,
  TrendingUp,
  Volume2,
} from "lucide-react"
import type { Song } from "@/lib/music/types"
import {
  generateMedleyTransition,
  createMedleySong,
  type MedleyTransitionPlan,
} from "@/lib/music/medley-engine"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { parseChord } from "@/lib/music/chord-parser"
import { getVoicingMidis } from "@/lib/music/chords"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface MedleyBuilderViewProps {
  songs: Song[]
  onSaveMedleySong: (medley: Song) => void
  onOpenSongLab: (songId: string) => void
}

export function MedleyBuilderView({
  songs,
  onSaveMedleySong,
  onOpenSongLab,
}: MedleyBuilderViewProps) {
  const [songAId, setSongAId] = useState<string>(songs[0]?.id ?? "")
  const [songBId, setSongBId] = useState<string>(songs[1]?.id ?? songs[0]?.id ?? "")
  const [isPlayingTransition, setIsPlayingTransition] = useState(false)

  const songA = useMemo(() => songs.find((s) => s.id === songAId) ?? songs[0], [songs, songAId])
  const songB = useMemo(
    () => songs.find((s) => s.id === songBId) ?? songs[1] ?? songs[0],
    [songs, songBId],
  )

  const transitionPlan: MedleyTransitionPlan | null = useMemo(() => {
    if (!songA || !songB) return null
    return generateMedleyTransition(songA, songB)
  }, [songA, songB])

  const handlePreviewTransition = () => {
    if (!transitionPlan) return
    setIsPlayingTransition(true)

    const chordsToPlay = transitionPlan.transitionChords
    let delay = 0
    chordsToPlay.forEach((entry, idx) => {
      setTimeout(() => {
        const parsed = parseChord(entry.symbol)
        if (parsed.valid) {
          const midis = getVoicingMidis(
            parsed,
            {
              octave: 4 + (entry.octaveOffset ?? 0),
              inversion: entry.inversion ?? 0,
            },
            true,
          )
          getAudioEngine().playChord(midis, { duration: 1.4, velocity: 0.92 })
        }
        if (idx === chordsToPlay.length - 1) {
          setTimeout(() => setIsPlayingTransition(false), 1500)
        }
      }, delay * 1000)
      delay += 1.3
    })
  }

  const handleMergeAndOpen = () => {
    if (!songA || !songB) return
    const medley = createMedleySong(songA, songB)
    onSaveMedleySong(medley)
    toast.success(`Created medley "${medley.title}"!`)
    onOpenSongLab(medley.id)
  }

  if (songs.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
        <Sparkles className="size-8 text-amber-400/40" />
        <h3 className="text-base font-bold text-white">Need at least 2 songs</h3>
        <p className="text-xs text-zinc-400 max-w-sm">
          Create another song in your library to use the AI Medley Builder for smooth transitions.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-20">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Sparkles className="size-6 text-amber-400" />
              <span>AI Medley Builder</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Harmonic modulation, tempo ramps, and SATB voice-leading bridges between any two songs
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleMergeAndOpen}
            className="h-9 px-4 font-mono text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 shadow-md gap-1.5 cursor-pointer"
          >
            <Merge className="size-4" />
            <span>Create Medley in Song Lab</span>
          </Button>
        </div>

        {/* Two Song Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Song A (Origin) */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-md">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              1. Opening Song (Song A)
            </span>
            <select
              value={songAId}
              onChange={(e) => setSongAId(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 font-mono text-xs font-bold text-white cursor-pointer outline-hidden focus:border-amber-400"
            >
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || "Untitled"} ({s.keyTonic} {s.keyMode} • {s.bpm} BPM)
                </option>
              ))}
            </select>
            {songA && (
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-zinc-400">
                <Badge variant="outline" className="border-amber-400/30 text-amber-300">
                  {songA.keyTonic} {songA.keyMode}
                </Badge>
                <span>{songA.bpm} BPM</span>
                <span>•</span>
                <span>{songA.sections.length} Sections</span>
              </div>
            )}
          </div>

          {/* Song B (Target) */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-md">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              2. Target Song (Song B)
            </span>
            <select
              value={songBId}
              onChange={(e) => setSongBId(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 font-mono text-xs font-bold text-white cursor-pointer outline-hidden focus:border-cyan-400"
            >
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || "Untitled"} ({s.keyTonic} {s.keyMode} • {s.bpm} BPM)
                </option>
              ))}
            </select>
            {songB && (
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-zinc-400">
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">
                  {songB.keyTonic} {songB.keyMode}
                </Badge>
                <span>{songB.bpm} BPM</span>
                <span>•</span>
                <span>{songB.sections.length} Sections</span>
              </div>
            )}
          </div>
        </div>

        {/* Transition Bridge Blueprint */}
        {transitionPlan && (
          <div className="flex flex-col gap-4 p-5 rounded-3xl border border-amber-400/30 bg-zinc-950/90 shadow-xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-amber-400" />
                <h3 className="font-mono text-sm font-black uppercase tracking-wider text-white">
                  Calculated Transition Bridge
                </h3>
              </div>

              {/* Preview Audio Button */}
              <Button
                size="sm"
                variant="outline"
                disabled={isPlayingTransition}
                onClick={handlePreviewTransition}
                className="h-8 px-3 font-mono text-xs font-bold border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 gap-1.5 cursor-pointer"
              >
                <Volume2 className={cn("size-3.5", isPlayingTransition && "animate-pulse")} />
                <span>{isPlayingTransition ? "Auditioning..." : "Audition Bridge"}</span>
              </Button>
            </div>

            {/* Modulation Strategy Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
                  Harmonic Strategy
                </span>
                <span className="font-bold text-amber-300">{transitionPlan.strategy}</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
                  Tempo Ramp Map
                </span>
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <span>{transitionPlan.bpmRamp.fromBpm} BPM</span>
                  <ArrowRight className="size-3 text-amber-400" />
                  <span>{transitionPlan.bpmRamp.toBpm} BPM</span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    ({transitionPlan.bpmRamp.isAccelerando ? "Accelerando" : "Ritardando"})
                  </span>
                </span>
              </div>
            </div>

            {/* Transition Chords Visual Ribbon */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Transition Bridge Chords (4 Bars)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {transitionPlan.transitionChords.map((chord, i) => (
                  <div
                    key={chord.id}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-center shadow-md relative"
                  >
                    <span className="absolute top-1.5 left-2 text-[9px] font-mono text-zinc-500">
                      Bar {i + 1}
                    </span>
                    <span className="font-mono text-lg font-black text-amber-400 mt-1">
                      {chord.symbol}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 mt-0.5">
                      {chord.beats} Beats • SATB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
