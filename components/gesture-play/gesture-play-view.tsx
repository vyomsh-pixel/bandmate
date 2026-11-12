"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Hand,
  Sparkles,
  Camera,
  CameraOff,
  Volume2,
  Zap,
  Activity,
  Layers,
  Music,
} from "lucide-react"
import type { Song, ChordEntry } from "@/lib/music/types"
import { parseChord } from "@/lib/music/chord-parser"
import { diatonicChords, makeKey } from "@/lib/music/scales"
import { getVoicingMidis } from "@/lib/music/chords"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { pcToName } from "@/lib/music/notes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface GesturePlayViewProps {
  song: Song
  onUpdateSong: (id: string, patch: Partial<Song> | ((s: Song) => Partial<Song>)) => void
}

const STRINGS_CONFIG = [
  { note: "E2", midi: 40, label: "6th (Low E)" },
  { note: "A2", midi: 45, label: "5th (A)" },
  { note: "D3", midi: 50, label: "4th (D)" },
  { note: "G3", midi: 55, label: "3rd (G)" },
  { note: "B3", midi: 59, label: "2nd (B)" },
  { note: "E4", midi: 64, label: "1st (High E)" },
]

export function GesturePlayView({ song }: GesturePlayViewProps) {
  const allSongChords = useMemo(() => song.sections.flatMap((s) => s.chords), [song.sections])
  const [selectedChordSymbol, setSelectedChordSymbol] = useState<string>(
    allSongChords[0]?.symbol ?? "C",
  )
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [vibratingString, setVibratingString] = useState<number | null>(null)
  const [strumSpeed, setStrumSpeed] = useState<number>(0.02)
  const [lastStrumDir, setLastStrumDir] = useState<"down" | "up">("down")

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastCrossRef = useRef<number>(0)
  const prevPointerY = useRef<number | null>(null)

  const keyObj = useMemo(() => makeKey(song.keyTonic, song.keyMode), [song.keyTonic, song.keyMode])
  const diatonicList = useMemo(() => diatonicChords(keyObj), [keyObj])

  // Parsed chord notes
  const activeChord = useMemo(() => parseChord(selectedChordSymbol), [selectedChordSymbol])
  const chordMidis = useMemo(() => {
    if (!activeChord.valid) return [48, 52, 55, 60]
    return getVoicingMidis(activeChord, { octave: 4, accidental: keyObj.accidental }, true)
  }, [activeChord, keyObj.accidental])

  const triggerStringPluck = useCallback(
    (stringIndex: number, velocity = 0.9) => {
      // Pick note from chord corresponding to string
      const midi = chordMidis[stringIndex % chordMidis.length] ?? (40 + stringIndex * 5)
      getAudioEngine().playNote(midi, { duration: 1.6, velocity })
      setVibratingString(stringIndex)
      setTimeout(() => setVibratingString((cur) => (cur === stringIndex ? null : cur)), 250)
    },
    [chordMidis],
  )

  const triggerFullStrum = useCallback(
    (direction: "down" | "up" = "down", spread = 0.025, velocity = 0.95) => {
      setLastStrumDir(direction)
      getAudioEngine().playChord(chordMidis, {
        duration: 2.0,
        velocity,
        strumDirection: direction,
        strumSpread: spread,
      })
      // Strum ripple animation
      for (let i = 0; i < 6; i++) {
        const strIdx = direction === "down" ? i : 5 - i
        setTimeout(() => {
          setVibratingString(strIdx)
          setTimeout(() => setVibratingString((cur) => (cur === strIdx ? null : cur)), 200)
        }, i * (spread * 1000))
      }
    },
    [chordMidis],
  )

  // Camera Motion Detection (Optical Flow trigger)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraActive(true)
      toast.success("Camera Motion Strum active! Wave your hand to strum.")
    } catch {
      toast.error("Camera access was not granted or is unavailable.")
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setIsCameraActive(false)
    prevFrameRef.current = null
  }

  // Optical Motion Detection Loop
  useEffect(() => {
    if (!isCameraActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    let isRunning = true

    const detectMotion = () => {
      if (!isRunning) return
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = 160
        canvas.height = 120
        ctx.drawImage(video, 0, 0, 160, 120)
        const frame = ctx.getImageData(0, 0, 160, 120)

        if (prevFrameRef.current) {
          const prevData = prevFrameRef.current.data
          const currData = frame.data
          let motionDiff = 0

          // Sample motion in center vertical strumming zone
          const startX = 40
          const endX = 120
          for (let y = 10; y < 110; y += 4) {
            for (let x = startX; x < endX; x += 4) {
              const idx = (y * 160 + x) * 4
              const rDiff = Math.abs(currData[idx] - prevData[idx])
              const gDiff = Math.abs(currData[idx + 1] - prevData[idx + 1])
              const bDiff = Math.abs(currData[idx + 2] - prevData[idx + 2])
              if (rDiff + gDiff + bDiff > 75) {
                motionDiff++
              }
            }
          }

          const now = performance.now()
          // If motion threshold reached and debounce passed (180ms cooldown)
          if (motionDiff > 120 && now - lastCrossRef.current > 200) {
            lastCrossRef.current = now
            triggerFullStrum("down", 0.022, 0.95)
          }
        }

        prevFrameRef.current = frame
      }
      animFrameRef.current = requestAnimationFrame(detectMotion)
    }

    animFrameRef.current = requestAnimationFrame(detectMotion)

    return () => {
      isRunning = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isCameraActive, triggerFullStrum])

  // Keyboard shortcut listener: Keys 1-7 switch chords
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= diatonicList.length) {
        const target = diatonicList[num - 1]
        if (target) setSelectedChordSymbol(target.symbol)
      } else if (e.code === "Space") {
        e.preventDefault()
        triggerFullStrum("down", 0.02, 0.95)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [diatonicList, triggerFullStrum])

  // Mouse/Touch Swipe Strumming Area
  const handlePointerDown = (e: React.PointerEvent) => {
    prevPointerY.current = e.clientY
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (prevPointerY.current === null) return
    const diffY = e.clientY - prevPointerY.current
    if (Math.abs(diffY) > 35) {
      const now = performance.now()
      if (now - lastCrossRef.current > 120) {
        lastCrossRef.current = now
        const dir = diffY > 0 ? "down" : "up"
        triggerFullStrum(dir, Math.max(0.012, 0.04 - Math.abs(diffY) * 0.0002), 0.95)
      }
      prevPointerY.current = e.clientY
    }
  }

  const handlePointerUp = () => {
    prevPointerY.current = null
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      {/* Left Column: Diatonic & Progression Chord Pads */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border/80 bg-zinc-950/70 p-3 sm:p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hand className="size-5 text-amber-400" />
            <h2 className="font-mono text-sm font-black uppercase tracking-wider text-white">
              Gesture Play
            </h2>
          </div>
          <Badge variant="outline" className="font-mono text-xs text-amber-400 border-amber-400/40">
            {song.keyTonic} {song.keyMode}
          </Badge>
        </div>

        {/* Diatonic Chord Palette */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            Diatonic Chords (Keys 1–7)
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            {diatonicList.map((c, i) => {
              const isSelected = selectedChordSymbol === c.symbol
              return (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => setSelectedChordSymbol(c.symbol)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2.5 rounded-xl font-mono transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-amber-400 text-black font-black shadow-lg shadow-amber-400/30 scale-105 ring-2 ring-amber-300"
                      : "bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800 border border-zinc-800 font-bold",
                  )}
                >
                  <span className="text-sm">{c.symbol}</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono mt-0.5 opacity-80",
                      isSelected ? "text-black font-black" : "text-amber-400",
                    )}
                  >
                    {c.roman} ({i + 1})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chords from Song Section */}
        {allSongChords.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Song Chords
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(allSongChords.map((c) => c.symbol))).map((sym) => {
                const isSelected = selectedChordSymbol === sym
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setSelectedChordSymbol(sym)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-mono text-xs transition-all cursor-pointer",
                      isSelected
                        ? "bg-emerald-400 text-black font-black shadow-md shadow-emerald-400/30 ring-1 ring-emerald-300"
                        : "bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 font-bold",
                    )}
                  >
                    {sym}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Air Strumming Camera Toggle */}
        <div className="mt-auto border-t border-zinc-800 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Camera className="size-3.5 text-amber-400" />
              <span>Camera Air Strum</span>
            </span>
            <Button
              size="sm"
              variant={isCameraActive ? "destructive" : "outline"}
              onClick={isCameraActive ? stopCamera : startCamera}
              className="h-7 px-2.5 font-mono text-[11px] font-bold cursor-pointer"
            >
              {isCameraActive ? "Stop Camera" : "Enable Camera"}
            </Button>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            Enable your webcam to strum chords by waving your hand in front of the screen.
          </p>

          {/* Hidden Canvas & Video for Optical Flow */}
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      {/* Main Stage: Physical Virtual Strumming Strings */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative bg-gradient-to-b from-zinc-950 via-zinc-925 to-zinc-950 select-none overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Top Active Chord Banner */}
        <div className="absolute top-4 sm:top-6 flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-5 py-2.5 shadow-xl backdrop-blur-md z-20">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Active Chord
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {selectedChordSymbol}
            </span>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          {/* Manual Strum Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => triggerFullStrum("down", 0.02, 0.95)}
              className="h-8 px-3 font-mono text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 shadow-md cursor-pointer"
            >
              ↓ Downstrum
            </Button>
            <Button
              size="sm"
              onClick={() => triggerFullStrum("up", 0.02, 0.95)}
              className="h-8 px-3 font-mono text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white cursor-pointer"
            >
              ↑ Upstrum
            </Button>
          </div>
        </div>

        {/* 6 Tactile Strum Strings Canvas */}
        <div className="w-full max-w-xl h-72 sm:h-96 flex flex-col justify-around py-4 relative z-10">
          {STRINGS_CONFIG.map((string, idx) => {
            const isVibrating = vibratingString === idx
            return (
              <div
                key={string.note}
                onClick={(e) => {
                  e.stopPropagation()
                  triggerStringPluck(idx, 0.95)
                }}
                className={cn(
                  "w-full h-10 flex items-center justify-between px-4 group cursor-pointer relative transition-all",
                  "hover:bg-amber-400/5 rounded-xl",
                )}
              >
                {/* String Label */}
                <span className="font-mono text-xs font-bold text-zinc-400 group-hover:text-amber-400 transition-colors z-20">
                  {string.note}
                </span>

                {/* Animated Physical String Line */}
                <div className="flex-1 mx-4 relative h-6 flex items-center justify-center">
                  <div
                    className={cn(
                      "w-full transition-all duration-75 relative",
                      isVibrating
                        ? "h-1 bg-amber-400 shadow-[0_0_16px_#fbbf24] animate-bounce"
                        : "h-[2px] bg-zinc-700 group-hover:bg-zinc-500",
                    )}
                  />
                  {isVibrating && (
                    <div className="absolute inset-x-0 h-4 bg-amber-400/20 blur-sm rounded-full pointer-events-none" />
                  )}
                </div>

                {/* Pluck Status Dot */}
                <div
                  className={cn(
                    "size-2.5 rounded-full transition-all z-20",
                    isVibrating
                      ? "bg-amber-400 scale-125 shadow-[0_0_8px_#fbbf24]"
                      : "bg-zinc-800 group-hover:bg-zinc-600",
                  )}
                />
              </div>
            )
          })}
        </div>

        {/* Instruction Footer Hint */}
        <div className="absolute bottom-4 sm:bottom-6 flex flex-col items-center gap-1 text-center font-mono text-[11px] text-zinc-400 z-20">
          <div className="flex items-center gap-2 font-bold text-zinc-300">
            <Zap className="size-3.5 text-amber-400 animate-pulse" />
            <span>Swipe or drag across strings to strum</span>
          </div>
          <span>Or press Spacebar to strum • Keys 1–7 to change chords</span>
        </div>
      </div>
    </div>
  )
}
