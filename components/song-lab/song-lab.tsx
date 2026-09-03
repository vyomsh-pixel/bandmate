"use client"

/**
 * BandMate — Song Lab (Phase 1 module).
 *
 * Orchestrates the theory + audio + storage engines behind a single editing
 * surface: edit a progression, transpose keys, inspect chord voicings on the
 * keyboard, hear individual chords, and play/loop the whole song with a
 * metronome. All state persists through the song library hook.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { SongMetaBar } from "./song-meta-bar"
import { ProgressionEditor } from "./progression-editor"
import { ChordDetail } from "./chord-detail"
import { PianoKeyboard } from "./piano-keyboard"
import { TransportBar } from "./transport-bar"
import { RehearsalMode } from "./rehearsal-mode"
import { parseChord } from "@/lib/music/chord-parser"
import { voiceChord, invertVoicing, playableVoicing } from "@/lib/music/chords"
import { suggestSmoothInversion } from "@/lib/music/voice-leading"
import { keyAccidental, MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { transposeProgression, transposeSymbol, semitonesBetween } from "@/lib/music/transpose"
import { midiToPc, noteNameToPc, pcToName } from "@/lib/music/notes"
import { getAudioEngine, type TransportConfig, type RhythmPattern } from "@/lib/audio/audio-engine"
import { AVAILABLE_INSTRUMENTS, type InstrumentId } from "@/lib/audio/soundfont-engine"
import { createId } from "@/lib/storage/local-store"
import type { ChordEntry, Section, Song } from "@/lib/music/types"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { cn } from "@/lib/utils"

interface SongLabProps {
  song: Song
  onUpdate: (id: string, patch: Partial<Song> | ((s: Song) => Partial<Song>)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  showPiano?: boolean
  showInspector?: boolean
  onToggleInspector?: () => void
}

/** Pick the tonic spelling (from the mode's option list) for a pitch class. */
function tonicForPc(pc: number, mode: "major" | "minor"): string {
  const list = mode === "major" ? MAJOR_TONICS : MINOR_TONICS
  const match = list.find((t) => noteNameToPc(t) === ((pc % 12) + 12) % 12)
  return match ?? pcToName(pc, "sharp")
}

export function SongLab({
  song,
  onUpdate,
  undo,
  redo,
  canUndo,
  canRedo,
  showPiano = true,
  showInspector = true,
  onToggleInspector,
}: SongLabProps) {
  const allChords = useMemo(() => song.sections.flatMap((s) => s.chords), [song.sections])

  const [selectedId, setSelectedId] = useState<string | null>(allChords[0]?.id ?? null)
  const [inversion, setInversion] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)
  const [metronome, setMetronome] = useState(true)
  const [loop, setLoop] = useState(true)
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bandmate_volume")
      if (saved !== null) {
        const num = parseFloat(saved)
        if (!isNaN(num) && num >= 0 && num <= 1) return num
      }
    }
    return 0.85
  })

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolumeState(clamped)
    if (typeof window !== "undefined") {
      localStorage.setItem("bandmate_volume", clamped.toString())
    }
  }, [])

  const [instrument, setInstrumentState] = useState<InstrumentId>("acoustic_grand_piano")
  const [isInstrumentLoading, setIsInstrumentLoading] = useState(false)
  const [rhythm, setRhythm] = useState<RhythmPattern>("pulse")
  const [isRehearsing, setIsRehearsing] = useState(false)

  // Resizable panel dimensions
  const [leftWidth, setLeftWidth] = useState(210)
  const [rightWidth, setRightWidth] = useState(290)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const [mobileTab, setMobileTab] = useState<"progression" | "inspector" | "sections">("progression")

  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingLeft(true)
    const startX = e.clientX
    const startW = leftWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const nextW = Math.max(140, Math.min(420, startW + delta))
      setLeftWidth(nextW)
    }

    const onMouseUp = () => {
      setIsDraggingLeft(false)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [leftWidth])

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingRight(true)
    const startX = e.clientX
    const startW = rightWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX
      const nextW = Math.max(200, Math.min(500, startW + delta))
      setRightWidth(nextW)
    }

    const onMouseUp = () => {
      setIsDraggingRight(false)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [rightWidth])

  const accidental = useMemo(() => keyAccidental(song.keyTonic, song.keyMode), [song.keyTonic, song.keyMode])

  // Keep selection valid as the song changes (e.g. after switching songs).
  useEffect(() => {
    if (!allChords.some((c) => c.id === selectedId)) {
      setSelectedId(allChords[0]?.id ?? null)
    }
  }, [allChords, selectedId])

  const selectedEntry = allChords.find((c) => c.id === selectedId) ?? null
  const parsedSelected = selectedEntry ? parseChord(selectedEntry.symbol) : null

  // Keep local inversion state synced with selectedEntry's stored inversion
  useEffect(() => {
    if (selectedEntry) {
      setInversion(selectedEntry.inversion ?? 0)
    }
  }, [selectedEntry?.id, selectedEntry?.inversion])

  // Currently playing chord entry (during playback) or selected chord entry (when stopped)
  const playingEntry = isPlaying && activeIndex !== null ? allChords[activeIndex] ?? null : null
  const displayedEntry = playingEntry ?? selectedEntry
  const parsedDisplayed = displayedEntry ? parseChord(displayedEntry.symbol) : null

  // Notes shown on the keyboard: follows the active running chord during playback, otherwise the selected chord
  // Using playableVoicing ensures slash chord bass notes (e.g. G/B) and inversions are properly rendered on the piano!
  const keyboardNotes = useMemo(() => {
    if (!parsedDisplayed?.valid) return []
    const inv = displayedEntry?.inversion ?? (displayedEntry?.id === selectedId ? inversion : 0)
    return playableVoicing(parsedDisplayed, { octave: 4, accidental, inversion: inv })
  }, [parsedDisplayed, displayedEntry?.inversion, displayedEntry?.id, selectedId, inversion, accidental])

  const activeMidis = keyboardNotes.map((n) => n.midi)
  const bassMidi = parsedDisplayed?.valid && parsedDisplayed.bassPc !== null
    ? activeMidis.find((m) => midiToPc(m) === parsedDisplayed.bassPc) ?? null
    : null
  const rootMidi = parsedDisplayed?.valid
    ? activeMidis.find((m) => midiToPc(m) === parsedDisplayed.rootPc) ?? null
    : null

  // ---- Audio helpers ---------------------------------------------------------
  const buildConfig = useCallback((): TransportConfig => {
    const acc = keyAccidental(song.keyTonic, song.keyMode)
    return {
      bpm: song.bpm,
      beatsPerBar: song.beatsPerBar,
      loop,
      metronome,
      rhythm,
      chords: allChords.map((entry) => {
        const parsed = parseChord(entry.symbol)
        const midis = parsed.valid
          ? playableVoicing(parsed, { octave: 4, accidental: acc, inversion: entry.inversion ?? 0 }).map((n) => n.midi)
          : []
        return { midis, beats: Math.max(1, entry.beats) }
      }),
    }
  }, [song.bpm, song.beatsPerBar, song.keyTonic, song.keyMode, allChords, loop, metronome, rhythm])

  const stopPlayback = useCallback(() => {
    getAudioEngine().stop()
    setIsPlaying(false)
    setActiveIndex(null)
    setCurrentBeat(null)
  }, [])

  const togglePlay = useCallback(async () => {
    const engine = getAudioEngine()
    if (engine.isRunning()) {
      stopPlayback()
      return
    }
    await engine.ensureContext()
    engine.setMasterVolume(volume)
    setIsPlaying(true)
    engine.start(
      buildConfig(),
      ({ beatInBar, chordIndex }) => {
        setCurrentBeat(beatInBar)
        if (chordIndex !== null) setActiveIndex(chordIndex)
      },
      () => {
        setIsPlaying(false)
        setActiveIndex(null)
        setCurrentBeat(null)
      }
    )
  }, [buildConfig, stopPlayback, volume])

  // Live-sync transport config while playing.
  useEffect(() => {
    if (isPlaying) getAudioEngine().updateConfig(buildConfig())
  }, [isPlaying, buildConfig])

  const handleInstrumentChange = useCallback(async (id: InstrumentId) => {
    setInstrumentState(id)
    setIsInstrumentLoading(true)
    await getAudioEngine().setInstrument(id)
    setIsInstrumentLoading(false)
    const name = AVAILABLE_INSTRUMENTS.find((i) => i.id === id)?.name ?? "Instrument"
    toast.success(`Sound: ${name}`)
  }, [])

  // Master volume follows the slider.
  useEffect(() => {
    getAudioEngine().setMasterVolume(volume)
  }, [volume])

  // Stop audio when leaving the song / unmounting.
  useEffect(() => {
    return () => {
      getAudioEngine().stop()
    }
  }, [song.id])

  const playSelectedChord = useCallback(() => {
    if (!parsedSelected?.valid) return
    const engine = getAudioEngine()
    engine.ensureContext().then(() => {
      engine.setMasterVolume(volume)
      const currentInv = selectedEntry?.inversion ?? inversion
      const midis = playableVoicing(parsedSelected, { octave: 4, accidental, inversion: currentInv }).map((n) => n.midi)
      engine.playChord(midis, { duration: 1.4 })
    })
  }, [parsedSelected, accidental, selectedEntry?.inversion, inversion, volume])

  // ---- Chord editing ---------------------------------------------------------
  const updateSections = useCallback(
    (updater: (sections: Section[]) => Section[]) => {
      onUpdate(song.id, (s) => ({ sections: updater(s.sections) }))
    },
    [onUpdate, song.id],
  )

  const handleUpdateChord = useCallback(
    (id: string, patch: Partial<ChordEntry>) => {
      updateSections((sections) =>
        sections.map((s) => ({
          ...s,
          chords: s.chords.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }))
      )
    },
    [updateSections],
  )

  const handleInversionChange = useCallback(
    (inv: number) => {
      setInversion(inv)
      if (selectedId) {
        handleUpdateChord(selectedId, { inversion: inv })
      }
    },
    [selectedId, handleUpdateChord],
  )

  const handleRemoveChord = useCallback(
    (id: string) => {
      updateSections((sections) =>
        sections.map((s) => ({
          ...s,
          chords: s.chords.filter((c) => c.id !== id),
        }))
      )
    },
    [updateSections],
  )

  const handleMoveChord = useCallback(
    (id: string, dir: -1 | 1) => {
      updateSections((sections) => {
        return sections.map((s) => {
          const i = s.chords.findIndex((c) => c.id === id)
          if (i < 0) return s
          const j = i + dir
          if (j < 0 || j >= s.chords.length) return s // Can't move outside section for now
          const next = [...s.chords]
          ;[next[i], next[j]] = [next[j], next[i]]
          return { ...s, chords: next }
        })
      })
    },
    [updateSections],
  )

  const handleAddChord = useCallback(
    (symbol: string) => {
      const entry: ChordEntry = { id: createId(), symbol, beats: song.beatsPerBar }
      updateSections((sections) => {
        if (sections.length === 0) {
          return [{ id: createId(), name: "Verse", chords: [entry] }]
        }
        // Add to the last section for now
        const next = [...sections]
        next[next.length - 1] = {
          ...next[next.length - 1],
          chords: [...next[next.length - 1].chords, entry]
        }
        return next
      })
      setSelectedId(entry.id)
    },
    [updateSections, song.beatsPerBar],
  )

  // ---- Key / transpose -------------------------------------------------------
  const handleKeyChange = useCallback(
    (newTonic: string) => {
      const semis = semitonesBetween(song.keyTonic, newTonic)
      if (semis === 0) {
        onUpdate(song.id, { keyTonic: newTonic })
        return
      }
      onUpdate(song.id, (s) => ({
        keyTonic: newTonic,
        sections: s.sections.map((sec) => ({
          ...sec,
          chords: transposeProgression(sec.chords, semis, newTonic, s.keyMode)
        })),
      }))
      toast.success(`Transposed to ${newTonic} ${song.keyMode}`)
    },
    [onUpdate, song.id, song.keyTonic, song.keyMode],
  )

  const handleTranspose = useCallback(
    (semitones: number) => {
      const oldPc = noteNameToPc(song.keyTonic) ?? 0
      const newTonic = tonicForPc(oldPc + semitones, song.keyMode)
      const acc = keyAccidental(newTonic, song.keyMode)
      onUpdate(song.id, (s) => ({
        keyTonic: newTonic,
        sections: s.sections.map((sec) => ({
          ...sec,
          chords: sec.chords.map((c) => ({ ...c, symbol: transposeSymbol(c.symbol, semitones, acc) }))
        })),
      }))
    },
    [onUpdate, song.id, song.keyTonic, song.keyMode],
  )

  const handleBpmChange = useCallback((bpm: number) => onUpdate(song.id, { bpm }), [onUpdate, song.id])

  const handleDuplicateChord = useCallback(
    (id: string) => {
      let nextId: string | null = null
      let sym = ""
      updateSections((sections) => {
        return sections.map((s) => {
          const i = s.chords.findIndex((c) => c.id === id)
          if (i < 0) return s
          const orig = s.chords[i]
          sym = orig.symbol
          const clone: ChordEntry = {
            id: createId(),
            symbol: orig.symbol,
            beats: orig.beats,
            inversion: orig.inversion ?? 0,
          }
          nextId = clone.id
          const next = [...s.chords]
          next.splice(i + 1, 0, clone)
          return { ...s, chords: next }
        })
      })
      if (nextId) {
        setSelectedId(nextId)
        toast.success(`Repeated chord ${sym}`)
      }
    },
    [updateSections],
  )

  const handleAutoVoiceSection = useCallback(
    (sectionId: string) => {
      updateSections((sections) =>
        sections.map((sec) => {
          if (sec.id !== sectionId || sec.chords.length <= 1) return sec
          let prevVoicing: Note[] = []
          const newChords = sec.chords.map((entry, idx) => {
            const parsed = parseChord(entry.symbol)
            if (!parsed.valid) return entry
            if (idx === 0) {
              const inv = entry.inversion ?? 0
              prevVoicing = playableVoicing(parsed, { octave: 4, accidental, inversion: inv })
              return entry
            }
            const bestInversion = suggestSmoothInversion(prevVoicing, parsed, accidental)
            prevVoicing = playableVoicing(parsed, { octave: 4, accidental, inversion: bestInversion })
            return { ...entry, inversion: bestInversion }
          })
          return { ...sec, chords: newChords }
        }),
      )
      toast.success("Voicings optimized for smooth voice leading!")
    },
    [updateSections, accidental],
  )

  // ---- Keyboard Shortcuts ----------------------------------------------------
  useKeyboardShortcuts({
    space: (e) => {
      e.preventDefault()
      togglePlay()
    },
    l: () => setLoop((v) => !v),
    m: () => setMetronome((v) => !v),
    d: () => {
      if (selectedId) handleDuplicateChord(selectedId)
    },
    r: () => {
      if (selectedId) handleDuplicateChord(selectedId)
    },
    arrowleft: () => {
      const idx = allChords.findIndex((c) => c.id === selectedId)
      if (idx > 0) {
        setSelectedId(allChords[idx - 1].id)
        setInversion(0)
      }
    },
    arrowright: () => {
      const idx = allChords.findIndex((c) => c.id === selectedId)
      if (idx >= 0 && idx < allChords.length - 1) {
        setSelectedId(allChords[idx + 1].id)
        setInversion(0)
      }
    },
    z: (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey) {
           redo()
        } else {
           undo()
        }
      }
    },
    y: (e) => {
      if (e.metaKey || e.ctrlKey) {
        redo()
      }
    },
    i: () => {
      onToggleInspector?.()
    }
  })

  const handleAddSection = useCallback(
    (type: string) => {
      let name = type
      if (type !== "Custom") {
        // Count existing sections of this type (e.g. "Verse", "Verse 1", "Verse 2")
        const regex = new RegExp(`^${type}(\\s+(\\d+))?$`, "i")
        const existingNums: number[] = []
        song.sections.forEach((s) => {
          const m = s.name.trim().match(regex)
          if (m) {
            existingNums.push(m[2] ? parseInt(m[2], 10) : 1)
          }
        })
        if (existingNums.length > 0) {
          const nextNum = Math.max(...existingNums) + 1
          name = `${type} ${nextNum}`
        }
      } else {
        name = `Section ${song.sections.length + 1}`
      }

      const newSec: Section = {
        id: createId(),
        name,
        chords: [{ id: createId(), symbol: song.keyTonic, beats: song.beatsPerBar }],
      }
      updateSections((sections) => [...sections, newSec])
      setSelectedId(newSec.chords[0].id)
      toast.success(`Added ${name} section`)
    },
    [updateSections, song.keyTonic, song.beatsPerBar, song.sections],
  )

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      updateSections((sections) => {
        if (sections.length <= 1) return sections // Keep at least one section
        const filtered = sections.filter((s) => s.id !== sectionId)
        return filtered
      })
      // Select first chord of remaining sections
      const remaining = song.sections.filter((s) => s.id !== sectionId)
      const firstChord = remaining.flatMap((s) => s.chords)[0]
      if (firstChord) setSelectedId(firstChord.id)
      toast.success("Section deleted")
    },
    [updateSections, song.sections],
  )

  const handleRenameSection = useCallback(
    (sectionId: string, name: string) => {
      updateSections((sections) =>
        sections.map((s) => (s.id === sectionId ? { ...s, name } : s))
      )
    },
    [updateSections],
  )

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Mobile Screen Segment Bar (< lg only) */}
      <div className="flex lg:hidden items-center justify-between border-b border-border/80 bg-card/60 px-2 sm:px-3 py-1.5 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1 w-full bg-muted/50 p-0.5 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setMobileTab("progression")}
            className={cn(
              "flex-1 py-1.5 text-center font-mono text-[11px] font-bold rounded-lg transition-all cursor-pointer touch-manipulation",
              mobileTab === "progression"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            🎼 Chords
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("inspector")}
            className={cn(
              "flex-1 py-1.5 text-center font-mono text-[11px] font-bold rounded-lg transition-all cursor-pointer touch-manipulation",
              mobileTab === "inspector"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            🔍 Voice ({parsedSelected?.symbol ?? "—"})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("sections")}
            className={cn(
              "flex-1 py-1.5 text-center font-mono text-[11px] font-bold rounded-lg transition-all cursor-pointer touch-manipulation",
              mobileTab === "sections"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            📑 Sections ({song.sections.length})
          </button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div className={cn("flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0", (isDraggingLeft || isDraggingRight) && "select-none")}>
        {/* Left Panel: Sections / Navigator */}
        <div
          className={cn(
            "flex-col justify-between border-r border-border/80 bg-card/30 p-3 shrink-0 overflow-y-auto",
            mobileTab === "sections" ? "flex flex-1 w-full" : "hidden lg:flex",
          )}
          style={{ width: typeof window !== "undefined" && window.innerWidth >= 1024 ? `${leftWidth}px` : undefined }}
        >
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sections
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground/80">{song.sections.length}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {song.sections.map((sec) => (
                <div
                  key={sec.id}
                  className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs font-bold shadow-xs transition-colors hover:border-border hover:bg-muted"
                >
                  <span className="truncate flex-1">{sec.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {sec.chords.length}
                    </span>
                    {song.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sec.id)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all cursor-pointer touch-manipulation"
                        aria-label={`Delete ${sec.name}`}
                        title={`Delete ${sec.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Permanent Quick-Add Section Palette (NEVER disappears) */}
            <div className="mt-2.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-mono">
                + Add Section
              </div>
              <div className="flex flex-wrap gap-1">
                {["Verse", "Chorus", "Pre-Chorus", "Bridge", "Intro", "Outro"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddSection(type)}
                    className="rounded-lg border border-dashed border-border/80 bg-card/60 px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-95 shadow-xs"
                    title={`Add another ${type} section`}
                  >
                    + {type}
                  </button>
                ))}
                {/* Custom Section */}
                <button
                  type="button"
                  onClick={() => handleAddSection("Custom")}
                  className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2 py-1 font-mono text-[10px] font-semibold text-primary/80 transition-all hover:border-primary hover:bg-primary/15 hover:text-primary cursor-pointer active:scale-95 shadow-xs"
                  title="Add a custom named section"
                >
                  + Custom
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Card: History & Shortcuts */}
          <div className="pt-2.5 border-t border-border/60">
            {/* Undo / Redo Row */}
            <div className="mb-2 flex items-center justify-between gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="h-6.5 flex-1 text-[11px] font-mono font-bold disabled:opacity-30 rounded-lg cursor-pointer"
              >
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="h-6.5 flex-1 text-[11px] font-mono font-bold disabled:opacity-30 rounded-lg cursor-pointer"
              >
                Redo
              </Button>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/40 p-2 shadow-xs">
              <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Shortcuts
              </div>
              <div className="space-y-0.5 text-[10px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Play / Pause</span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    Space
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Loop On/Off</span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    L
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Metronome</span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    M
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Repeat Chord</span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    D / R
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inspector</span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    I
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Select Next</span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    ← →
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Draggable Resizer */}
        <div
          onMouseDown={startResizeLeft}
          className={cn(
            "hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center relative z-20 group transition-colors select-none",
            "hover:bg-primary/40 active:bg-primary/70",
            isDraggingLeft && "bg-primary/70",
          )}
          title="Drag left/right to resize Sections panel"
        >
          <div className="h-8 w-0.5 rounded-full bg-border/80 group-hover:bg-primary group-hover:h-12 group-hover:w-1 transition-all" />
        </div>

        {/* Center Panel: Transport + Timeline + Editor + Keyboard */}
        <div className={cn("flex-col min-w-0 h-full overflow-hidden", mobileTab === "progression" ? "flex flex-1" : "hidden lg:flex lg:flex-1")}>
          {/* Transport Bar Header */}
          <div className="shrink-0 border-b border-border/80 bg-background/95 px-2 sm:px-4 py-1.5 sm:py-2 backdrop-blur-md shadow-xs z-10">
            <TransportBar
              isPlaying={isPlaying}
              bpm={song.bpm}
              beatsPerBar={song.beatsPerBar}
              currentBeat={currentBeat}
              loop={loop}
              metronome={metronome}
              volume={volume}
              instrument={instrument}
              isInstrumentLoading={isInstrumentLoading}
              rhythm={rhythm}
              onTogglePlay={togglePlay}
              onBpmChange={handleBpmChange}
              onToggleLoop={() => setLoop((v) => !v)}
              onToggleMetronome={() => setMetronome((v) => !v)}
              onToggleRehearsal={() => setIsRehearsing(true)}
              onVolumeChange={setVolume}
              onInstrumentChange={handleInstrumentChange}
              onRhythmChange={setRhythm}
            />
          </div>

          {/* Hero Progression Editor (Spacious, Zero Clipping) */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-5 min-h-0">
            <ProgressionEditor
              sections={song.sections}
              keyTonic={song.keyTonic}
              keyMode={song.keyMode}
              selectedId={selectedId}
              activeIndex={isPlaying ? activeIndex : null}
              onSelect={(id) => {
                setSelectedId(id)
              }}
              onUpdate={handleUpdateChord}
              onRemove={handleRemoveChord}
              onMove={handleMoveChord}
              onAdd={handleAddChord}
              onDuplicate={handleDuplicateChord}
              onDeleteSection={handleDeleteSection}
              onRenameSection={handleRenameSection}
              onAutoVoice={handleAutoVoiceSection}
              onAddSection={handleAddSection}
            />
          </div>

          {/* Virtual Piano Dock (Collapsible) */}
          {showPiano && (
            <div className="shrink-0 border-t border-border/80 bg-card/40 px-2 sm:px-3 py-1.5 sm:py-2 backdrop-blur-md">
              <PianoKeyboard
                activeMidis={activeMidis}
                rootMidi={rootMidi}
                bassMidi={bassMidi}
                accidental={accidental}
              />
            </div>
          )}
        </div>

        {/* Right Draggable Resizer */}
        {showInspector && (
          <div
            onMouseDown={startResizeRight}
            className={cn(
              "hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center relative z-20 group transition-colors select-none",
              "hover:bg-primary/40 active:bg-primary/70",
              isDraggingRight && "bg-primary/70",
            )}
            title="Drag left/right to resize Inspector panel"
          >
            <div className="h-8 w-0.5 rounded-full bg-border/80 group-hover:bg-primary group-hover:h-12 group-hover:w-1 transition-all" />
          </div>
        )}

        {/* Right Panel: Inspector */}
        <div
          className={cn(
            "border-l border-border/80 lg:border-t-0 border-t bg-card/30 p-3.5 shrink-0 overflow-y-auto",
            mobileTab === "inspector"
              ? "flex flex-col flex-1 w-full"
              : showInspector
                ? "hidden lg:block"
                : "hidden",
          )}
          style={{ width: typeof window !== "undefined" && window.innerWidth >= 1024 && showInspector ? `${rightWidth}px` : undefined }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Inspector
              </h3>
              <span className="font-mono text-[10px] text-muted-foreground/80">Chord Voice</span>
            </div>
            {onToggleInspector && (
              <button
                type="button"
                onClick={onToggleInspector}
                className="hidden lg:flex rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                title="Close Inspector (I)"
                aria-label="Close Inspector"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <ChordDetail
            chord={isPlaying && parsedDisplayed ? parsedDisplayed : parsedSelected}
            accidental={accidental}
            inversion={isPlaying ? (displayedEntry?.inversion ?? 0) : (selectedEntry?.inversion ?? inversion)}
            onInversionChange={handleInversionChange}
            onPlay={playSelectedChord}
            onDuplicate={selectedId ? () => handleDuplicateChord(selectedId) : undefined}
          />
        </div>
      </div>

      {/* Fullscreen Overlays */}
      {isRehearsing && (
        <RehearsalMode
          song={song}
          isPlaying={isPlaying}
          activeIndex={isPlaying ? activeIndex : null}
          volume={volume}
          onVolumeChange={setVolume}
          onTogglePlay={togglePlay}
          onClose={() => setIsRehearsing(false)}
        />
      )}
    </div>
  )
}
