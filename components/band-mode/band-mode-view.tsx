"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
  Users,
  Play,
  Square,
  Volume2,
  VolumeX,
  Disc3,
  Sliders,
  Sparkles,
  RotateCcw,
  Music2,
  Download,
  Share2,
} from "lucide-react"
import type { Song } from "@/lib/music/types"
import {
  generateBandArrangement,
  GROOVE_STYLES,
  DEFAULT_BAND_TRACKS,
  isTrackAudible,
  type GrooveStyle,
  type BandTrackConfig,
  type BandArrangement,
  type BandTrackType,
} from "@/lib/music/band-arranger"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface BandModeViewProps {
  song: Song
  onUpdateSong?: (id: string, patch: Partial<Song>) => void
}

const TRACK_ICONS: Record<BandTrackType, string> = {
  drums: "🥁",
  bass: "🎸",
  keys: "🎹",
  guitar: "🪕",
}

const TRACK_DESCRIPTIONS: Record<BandTrackType, string> = {
  drums: "Kick, Snare & Hi-Hat Pocket",
  bass: "Root, 5th & Walking Bassline",
  keys: "SATB Piano / Rhodes Comping",
  guitar: "Rhythm Strum & Accent Chords",
}

export function BandModeView({ song, onUpdateSong }: BandModeViewProps) {
  const [groove, setGroove] = useState<GrooveStyle>("rock")
  const [tracks, setTracks] = useState<BandTrackConfig[]>(DEFAULT_BAND_TRACKS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [masterVolume, setMasterVolume] = useState(0.85)

  // Level meters simulated/real-time state (0 to 12 segments)
  const [meterLevels, setMeterLevels] = useState<Record<BandTrackType, number>>({
    drums: 0,
    bass: 0,
    keys: 0,
    guitar: 0,
  })

  const arrangement: BandArrangement = useMemo(() => {
    return generateBandArrangement(song, groove)
  }, [song, groove])

  const playbackTimerRef = useRef<number | null>(null)
  const currentBeatRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)

  // Keep ref synchronized
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
      }
    }
  }, [])

  // Toggle Solo for a track
  const toggleSolo = useCallback((trackId: BandTrackType) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t)),
    )
  }, [])

  // Toggle Mute for a track
  const toggleMute = useCallback((trackId: BandTrackType) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    )
  }, [])

  // Update track volume
  const setTrackVolume = useCallback((trackId: BandTrackType, vol: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: vol } : t)),
    )
  }, [])

  // Update track pan
  const setTrackPan = useCallback((trackId: BandTrackType, pan: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, pan } : t)),
    )
  }, [])

  // Handle Play/Stop loop
  const handleTogglePlay = useCallback(async () => {
    const audio = getAudioEngine()
    await audio.ensureContext()

    if (isPlaying) {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
      setIsPlaying(false)
      setCurrentBeat(0)
      currentBeatRef.current = 0
      setMeterLevels({ drums: 0, bass: 0, keys: 0, guitar: 0 })
      return
    }

    setIsPlaying(true)
    const bpm = arrangement.bpm || 120
    const beatIntervalMs = (60 / bpm) * 1000
    const tickIntervalMs = beatIntervalMs / 4 // 16th-note clock resolution
    let current16th = 0
    const total16ths = arrangement.totalBeats * 4

    playbackTimerRef.current = window.setInterval(() => {
      const beatFloat = current16th / 4
      currentBeatRef.current = Math.floor(beatFloat)
      setCurrentBeat(Math.floor(beatFloat))

      const audioCtx = audio.currentTime

      // 1. Trigger Drums
      const drumTrack = tracks.find((t) => t.id === "drums")!
      if (isTrackAudible(drumTrack, tracks)) {
        const events = arrangement.drums.filter(
          (d) => Math.abs(d.beat - beatFloat) < 0.12,
        )
        for (const evt of events) {
          audio.playDrum(
            evt.type,
            audioCtx,
            evt.velocity * drumTrack.volume * masterVolume,
          )
          setMeterLevels((m) => ({
            ...m,
            drums: Math.min(12, Math.floor(evt.velocity * drumTrack.volume * 12)),
          }))
        }
      }

      // 2. Trigger Bass
      const bassTrack = tracks.find((t) => t.id === "bass")!
      if (isTrackAudible(bassTrack, tracks)) {
        const events = arrangement.bass.filter(
          (b) => Math.abs(b.beat - beatFloat) < 0.12,
        )
        for (const evt of events) {
          for (const m of evt.midis) {
            audio.playNote(m, {
              when: audioCtx,
              duration: (evt.durationBeats * 60) / bpm,
              velocity: evt.velocity * bassTrack.volume * masterVolume,
              instrument: "electric_bass_finger",
            })
          }
          setMeterLevels((m) => ({
            ...m,
            bass: Math.min(12, Math.floor(evt.velocity * bassTrack.volume * 12)),
          }))
        }
      }

      // 3. Trigger Keys
      const keysTrack = tracks.find((t) => t.id === "keys")!
      if (isTrackAudible(keysTrack, tracks)) {
        const events = arrangement.keys.filter(
          (k) => Math.abs(k.beat - beatFloat) < 0.12,
        )
        for (const evt of events) {
          audio.playChord(evt.midis, {
            when: audioCtx,
            duration: (evt.durationBeats * 60) / bpm,
            velocity: evt.velocity * keysTrack.volume * masterVolume,
            instrument: groove === "lofi" ? "synth_warm" : "acoustic_grand_piano",
          })
          setMeterLevels((m) => ({
            ...m,
            keys: Math.min(12, Math.floor(evt.velocity * keysTrack.volume * 12)),
          }))
        }
      }

      // 4. Trigger Guitar
      const guitarTrack = tracks.find((t) => t.id === "guitar")!
      if (isTrackAudible(guitarTrack, tracks)) {
        const events = arrangement.guitar.filter(
          (g) => Math.abs(g.beat - beatFloat) < 0.12,
        )
        for (const evt of events) {
          audio.playChord(evt.midis, {
            when: audioCtx,
            duration: (evt.durationBeats * 60) / bpm,
            velocity: evt.velocity * guitarTrack.volume * masterVolume,
            instrument: groove === "bossa" ? "acoustic_guitar_nylon" : "acoustic_guitar_steel",
            strumSpread: 0.022,
          })
          setMeterLevels((m) => ({
            ...m,
            guitar: Math.min(12, Math.floor(evt.velocity * guitarTrack.volume * 12)),
          }))
        }
      }

      // Meter decay
      setMeterLevels((prev) => ({
        drums: Math.max(0, prev.drums - 1.5),
        bass: Math.max(0, prev.bass - 1.5),
        keys: Math.max(0, prev.keys - 1.5),
        guitar: Math.max(0, prev.guitar - 1.5),
      }))

      current16th = (current16th + 1) % total16ths
    }, tickIntervalMs)
  }, [isPlaying, arrangement, tracks, masterVolume, groove])

  // Reset mute & solo
  const handleResetMixer = () => {
    setTracks(DEFAULT_BAND_TRACKS)
    toast.info("Mixer channels reset to defaults")
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#090b0e] text-zinc-100 select-none">
      {/* Top Header Console */}
      <header className="border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
            <Users className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-bold tracking-tight text-zinc-100">
                BAND MODE MULTI-TRACK CONSOLE
              </h1>
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 font-mono text-[10px] text-amber-300"
              >
                PHASE 5 ENGINE
              </Badge>
            </div>
            <p className="font-mono text-xs text-zinc-400">
              Song: <span className="text-zinc-200 font-semibold">{song.title || "Untitled"}</span> · Key of{" "}
              <span className="text-amber-400 font-semibold">{song.keyTonic} {song.keyMode}</span> · {arrangement.bpm} BPM
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetMixer}
            className="border-zinc-700 bg-zinc-800/80 font-mono text-xs text-zinc-300 hover:bg-zinc-700"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset Mix
          </Button>

          <Button
            size="sm"
            onClick={handleTogglePlay}
            className={cn(
              "font-mono text-xs font-bold transition-all shadow-md cursor-pointer",
              isPlaying
                ? "bg-amber-500 hover:bg-amber-600 text-zinc-950 ring-2 ring-amber-400/50"
                : "bg-emerald-600 hover:bg-emerald-500 text-white",
            )}
          >
            {isPlaying ? (
              <>
                <Square className="mr-1.5 size-3.5 fill-current" />
                STOP BAND
              </>
            ) : (
              <>
                <Play className="mr-1.5 size-3.5 fill-current" />
                PLAY BAND
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Studio Deck */}
      <div className="flex flex-1 flex-col lg:flex-row min-h-0">
        {/* Left Side: Groove Selector & Master Section */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/60 p-5 flex flex-col gap-5 shrink-0">
          <div>
            <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-zinc-400 mb-2">
              Groove &amp; Arranger Style
            </label>
            <div className="grid grid-cols-1 gap-2">
              {GROOVE_STYLES.map((g) => {
                const active = groove === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => setGroove(g.id)}
                    className={cn(
                      "flex flex-col text-left rounded-md border p-2.5 transition-all cursor-pointer font-mono",
                      active
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-100">{g.name}</span>
                      {active && <span className="size-2 rounded-full bg-amber-400 animate-pulse" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                      {g.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Master Transport Telemetry */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span>MASTER SECTION</span>
              <span className="text-[10px] text-amber-400 font-bold">24-BIT / 48kHz</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Master Level</span>
                  <span>{Math.round(masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Position</span>
                <span className="font-bold text-amber-400">
                  Beat {currentBeat + 1} / {arrangement.totalBeats}
                </span>
              </div>
            </div>
          </div>

          {/* Active Progress Monitor */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 font-mono">
            <div className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Chord Progression Pulse</div>
            <div className="flex flex-wrap gap-1.5">
              {song.sections.flatMap((s) => s.chords).map((c, i) => {
                return (
                  <div
                    key={c.id || i}
                    className="flex flex-col items-center justify-center px-2 py-1 rounded bg-zinc-800 border border-zinc-700/60 min-w-8 text-center"
                  >
                    <span className="text-xs font-bold text-amber-300">{c.symbol}</span>
                    <span className="text-[9px] text-zinc-500">{c.beats}b</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Tactile 4-Channel Mixer Console */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
            {tracks.map((track) => {
              const audible = isTrackAudible(track, tracks)
              const meter = meterLevels[track.id] || 0

              return (
                <div
                  key={track.id}
                  className={cn(
                    "flex flex-col rounded-xl border bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-[#080a0d] p-4 transition-all shadow-xl font-mono",
                    audible
                      ? "border-zinc-700/80 shadow-black/60"
                      : "border-zinc-800/40 opacity-60",
                  )}
                >
                  {/* Channel Strip Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{TRACK_ICONS[track.id]}</span>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-100">{track.name}</h3>
                        <p className="text-[10px] text-zinc-400">{TRACK_DESCRIPTIONS[track.id]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Channel Strip Controls (Solo & Mute) */}
                  <div className="grid grid-cols-2 gap-2 my-4">
                    <button
                      onClick={() => toggleSolo(track.id)}
                      className={cn(
                        "rounded py-1.5 font-bold text-xs transition-all cursor-pointer border",
                        track.solo
                          ? "bg-amber-500 text-zinc-950 border-amber-400 font-extrabold shadow-md shadow-amber-500/20"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200",
                      )}
                    >
                      SOLO
                    </button>
                    <button
                      onClick={() => toggleMute(track.id)}
                      className={cn(
                        "rounded py-1.5 font-bold text-xs transition-all cursor-pointer border",
                        track.muted
                          ? "bg-red-600 text-white border-red-500 font-extrabold shadow-md shadow-red-600/20"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200",
                      )}
                    >
                      MUTE
                    </button>
                  </div>

                  {/* Pan Control */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>PAN</span>
                      <span className="text-amber-400">
                        {track.pan === 0 ? "CENTER" : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={track.pan}
                      onChange={(e) => setTrackPan(track.id, parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1 bg-zinc-800 rounded"
                    />
                  </div>

                  {/* Vertical Fader & Peak LED Meter Layout */}
                  <div className="flex items-center justify-around flex-1 py-4 bg-zinc-950/80 rounded-lg border border-zinc-800/80 px-4">
                    {/* Level Fader */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] text-zinc-400">FADER</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                        className="h-36 -rotate-90 w-36 accent-amber-500 cursor-pointer my-12"
                      />
                      <span className="text-[10px] font-bold text-zinc-300">
                        {Math.round(track.volume * 100)}%
                      </span>
                    </div>

                    {/* 12-Segment Peak LED Ladder */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-zinc-500">VU</span>
                      <div className="flex flex-col-reverse gap-1 p-1 bg-black/60 rounded border border-zinc-800">
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const active = meter >= idx + 1
                          const isHigh = idx >= 10
                          const isMid = idx >= 7 && idx < 10

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "w-3 h-2 rounded-[1px] transition-colors",
                                active
                                  ? isHigh
                                    ? "bg-red-500 shadow-sm shadow-red-500"
                                    : isMid
                                    ? "bg-amber-400 shadow-sm shadow-amber-400"
                                    : "bg-emerald-400 shadow-sm shadow-emerald-400"
                                  : "bg-zinc-800/50",
                              )}
                            />
                          )
                        })}
                      </div>
                      <span className="text-[9px] text-zinc-500">dB</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Console Status & Export Pill */}
          <div className="mt-6 flex flex-wrap items-center justify-between border-t border-zinc-800/80 pt-4 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Track DSP Engine Connected</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Arrangement tracks synthesize live via zero-latency WebAudio oscillators &amp; soundfonts
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
