"use client"

/**
 * BandMate — Song Lab (Phase 1 module).
 *
 * Orchestrates the theory + audio + storage engines behind a single editing
 * surface: edit a progression, transpose keys, inspect chord voicings on the
 * keyboard, hear individual chords, and play/loop the whole song with a
 * metronome. All state persists through the song library hook.
 */

import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react"
import { toast } from "sonner"
import { ProgressionEditor } from "./progression-editor"
import { ChordDetail } from "./chord-detail"
import { PianoKeyboard } from "./piano-keyboard"
import { GuitarFretboard } from "@/components/instrument-lab/guitar-fretboard"
import { VoiceLeadingRibbon } from "./voice-leading-ribbon"
import { TransportBar } from "./transport-bar"
import { VoiceRibbon } from "./voice-ribbon"
import { parseChord } from "@/lib/music/chord-parser"
import { playableVoicing, getVoicingMidis } from "@/lib/music/chords"

const RehearsalMode = lazy(() =>
  import("./rehearsal-mode").then((m) => ({ default: m.RehearsalMode })),
)
import { suggestSmoothInversion, suggestOptimalVoicing, autoVoiceProgression, assignSATBVoices, type VoicingStyle } from "@/lib/music/voice-leading"
import { keyAccidental } from "@/lib/music/scales"
import { midiToPc } from "@/lib/music/notes"
import { getAudioEngine, type TransportConfig, type RhythmPattern } from "@/lib/audio/audio-engine"
import { AVAILABLE_INSTRUMENTS, type InstrumentId } from "@/lib/audio/soundfont-engine"
import { createId } from "@/lib/storage/local-store"
import type { ChordEntry, Section, Song, Note } from "@/lib/music/types"
import { Button } from "@/components/ui/button"
import { X, Piano, Layers, Music4, Search, ListMusic, Plus, Keyboard, Activity, ChevronUp, ChevronDown, HelpCircle } from "lucide-react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { ShortcutsModal } from "./shortcuts-modal"
import { cn } from "@/lib/utils"

import type { ParsedSongResult } from "@/lib/music/song-parser"

interface SongLabProps {
  song: Song
  onUpdate: (id: string, patch: Partial<Song> | ((s: Song) => Partial<Song>)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  onImportSong?: (songData: ParsedSongResult) => void
  showPiano?: boolean
  onTogglePiano?: () => void
  showInspector?: boolean
  onToggleInspector?: () => void
}


export function SongLab({
  song,
  onUpdate,
  undo,
  redo,
  canUndo,
  canRedo,
  onImportSong,
  showPiano = true,
  onTogglePiano,
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
  const [twoHanded, setTwoHanded] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(showPiano)
  const [bottomDeckView, setBottomDeckView] = useState<"piano" | "guitar" | "voice-leading">("piano")
  const [showVoiceRibbon, setShowVoiceRibbon] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    setShowKeyboard(showPiano)
  }, [showPiano])

  // Resizable panel dimensions
  const [leftWidth, setLeftWidth] = useState(210)
  const [rightWidth, setRightWidth] = useState(290)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const [mobileTab, setMobileTab] = useState<"progression" | "piano" | "inspector" | "sections">("progression")

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
    const octOffset = displayedEntry?.octaveOffset ?? 0
    const style = displayedEntry?.voicingStyle ?? "standard"
    return playableVoicing(parsedDisplayed, {
      octave: 4,
      accidental,
      inversion: inv,
      octaveOffset: octOffset,
      voicingStyle: style,
    })
  }, [
    parsedDisplayed,
    displayedEntry?.inversion,
    displayedEntry?.octaveOffset,
    displayedEntry?.voicingStyle,
    displayedEntry?.id,
    selectedId,
    inversion,
    accidental,
  ])

  const activeMidis = keyboardNotes.map((n) => n.midi)
  const bassMidi = parsedDisplayed?.valid && parsedDisplayed.bassPc !== null
    ? activeMidis.find((m) => midiToPc(m) === parsedDisplayed.bassPc) ?? null
    : null
  const rootMidi = parsedDisplayed?.valid
    ? activeMidis.find((m) => midiToPc(m) === parsedDisplayed.rootPc) ?? null
    : null

  // Map each active MIDI note to its SATB voice role for unified color-coding across piano & ribbon
  const satbVoiceMap = useMemo(() => {
    if (keyboardNotes.length === 0) return undefined
    const satb = assignSATBVoices(keyboardNotes)
    const map: Record<number, "soprano" | "alto" | "tenor" | "bass"> = {}
    satb.forEach((v) => {
      map[v.note.midi] = v.voice
    })
    return map
  }, [keyboardNotes])

  const activeChordIdx = useMemo(() => {
    const targetId = displayedEntry?.id ?? selectedId
    return allChords.findIndex((c) => c.id === targetId)
  }, [allChords, displayedEntry?.id, selectedId])

  const nextChordEntry = useMemo(() => {
    if (activeChordIdx < 0 || activeChordIdx >= allChords.length - 1) return null
    return allChords[activeChordIdx + 1]
  }, [allChords, activeChordIdx])

  const activeSectionId = useMemo(() => {
    const targetId = displayedEntry?.id ?? selectedId
    return song.sections.find((s) => s.chords.some((c) => c.id === targetId))?.id ?? song.sections[0]?.id
  }, [song.sections, displayedEntry?.id, selectedId])

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
        const midis = getVoicingMidis(
          parsed,
          {
            octave: 4,
            accidental: acc,
            inversion: entry.inversion ?? 0,
            octaveOffset: entry.octaveOffset ?? 0,
            voicingStyle: entry.voicingStyle ?? "standard",
          },
          twoHanded
        )
        return { midis, beats: Math.max(1, entry.beats) }
      }),
    }
  }, [song.bpm, song.beatsPerBar, song.keyTonic, song.keyMode, allChords, loop, metronome, rhythm, twoHanded])

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
      const currentOctOffset = selectedEntry?.octaveOffset ?? 0
      const currentStyle = selectedEntry?.voicingStyle ?? "standard"
      const midis = getVoicingMidis(
        parsedSelected,
        {
          octave: 4,
          accidental,
          inversion: currentInv,
          octaveOffset: currentOctOffset,
          voicingStyle: currentStyle,
        },
        twoHanded
      )
      engine.playChord(midis, { duration: 1.4 })
    })
  }, [
    parsedSelected,
    accidental,
    selectedEntry?.inversion,
    selectedEntry?.octaveOffset,
    selectedEntry?.voicingStyle,
    inversion,
    volume,
    twoHanded,
  ])

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
    (id: string, delta: number) => {
      if (delta === 0) return
      updateSections((sections) => {
        return sections.map((s) => {
          const i = s.chords.findIndex((c) => c.id === id)
          if (i < 0) return s
          const j = Math.max(0, Math.min(s.chords.length - 1, i + delta))
          if (j === i) return s
          const next = [...s.chords]
          const [moved] = next.splice(i, 1)
          next.splice(j, 0, moved)
          return { ...s, chords: next }
        })
      })
    },
    [updateSections],
  )

  const handleAddChord = useCallback(
    (symbol: string, targetSectionId?: string) => {
      const entry: ChordEntry = { id: createId(), symbol, beats: song.beatsPerBar }
      updateSections((sections) => {
        if (sections.length === 0) {
          return [{ id: createId(), name: "Verse 1", chords: [entry] }]
        }

        // Determine destination section:
        // 1. Explicit targetSectionId passed (e.g. clicking "+ Add Chord" in Verse 1's header)
        // 2. Section containing currently selected chord (selectedId)
        // 3. Fallback to last section
        let targetIdx = -1
        if (targetSectionId) {
          targetIdx = sections.findIndex((s) => s.id === targetSectionId)
        }
        if (targetIdx < 0 && selectedId) {
          targetIdx = sections.findIndex((s) => s.chords.some((c) => c.id === selectedId))
        }
        if (targetIdx < 0) {
          targetIdx = sections.length - 1
        }

        const next = [...sections]
        next[targetIdx] = {
          ...next[targetIdx],
          chords: [...next[targetIdx].chords, entry],
        }
        return next
      })
      setSelectedId(entry.id)
    },
    [updateSections, song.beatsPerBar, selectedId],
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
          const voiced = autoVoiceProgression(sec.chords, { accidental })
          const newChords = sec.chords.map((entry, idx) => ({
            ...entry,
            inversion: voiced[idx]?.inversion ?? 0,
            octaveOffset: voiced[idx]?.octaveOffset ?? 0,
          }))
          return { ...sec, chords: newChords }
        }),
      )
      toast.success("Voicings smoothed: Common tones preserved & leaps eliminated!")
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
    },
    p: () => {
      setShowKeyboard((v) => !v)
      onTogglePiano?.()
    },
    "?": () => {
      setShowShortcuts((v) => !v)
    },
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
              {song.sections.map((sec) => {
                const isActiveSection = sec.chords.some((c) => c.id === selectedId)
                return (
                  <div
                    key={sec.id}
                    onClick={() => {
                      const first = sec.chords[0]
                      if (first) setSelectedId(first.id)
                    }}
                    className={cn(
                      "group flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer select-none",
                      isActiveSection
                        ? "border-amber-400/80 bg-amber-400/10 text-amber-300 font-extrabold shadow-sm"
                        : "border-border/60 bg-background/50 text-foreground hover:border-border hover:bg-muted",
                    )}
                  >
                    <span className="truncate flex-1">{sec.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {sec.chords.length}
                      </span>
                      {song.sections.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSection(sec.id)
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all cursor-pointer touch-manipulation"
                          aria-label={`Delete ${sec.name}`}
                          title={`Delete ${sec.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Clean Single + Add Section Row */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => handleAddSection("Verse")}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-xs font-bold text-muted-foreground transition-all hover:border-amber-500/50 hover:bg-secondary hover:text-amber-300 cursor-pointer shadow-xs"
                title="Add a new section to the song"
              >
                <Plus className="size-3.5" />
                <span>Add Section</span>
              </button>
            </div>
          </div>

          {/* Bottom Rail: Shortcuts Guide Modal Trigger */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/70 bg-background/50 hover:bg-muted font-mono text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs select-none"
              title="Keyboard shortcuts guide (?)"
            >
              <div className="flex items-center gap-1.5">
                <Keyboard className="size-3.5 text-amber-400" />
                <span>Shortcuts</span>
              </div>
              <kbd className="font-mono text-[9px] font-bold text-zinc-400 bg-muted px-1.5 py-0.5 rounded border border-border/80">
                ?
              </kbd>
            </button>
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

            {/* Interactive Voice Ribbon Trajectory */}
            {allChords.length >= 2 && (
              <div className="mt-2 rounded-xl border border-border/70 bg-zinc-950/70 overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-3 py-1 bg-zinc-900/80 border-b border-border/40 select-none">
                  <button
                    type="button"
                    onClick={() => setShowVoiceRibbon((v) => !v)}
                    className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <Activity className="size-3 text-amber-400" />
                    <span>VOICE-FLOW TRAJECTORY</span>
                    <span className="text-[9px] text-zinc-500 font-normal">
                      ({showVoiceRibbon ? "Expanded" : "Collapsed"})
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline">
                      ● Soprano ● Alto ● Tenor ● Bass
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVoiceRibbon((v) => !v)}
                      className="p-0.5 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      title={showVoiceRibbon ? "Collapse Trajectory Ribbon" : "Expand Trajectory Ribbon"}
                    >
                      {showVoiceRibbon ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                  </div>
                </div>
                {showVoiceRibbon && (
                  <VoiceRibbon
                    chords={allChords}
                    selectedIndex={Math.max(0, allChords.findIndex((c) => c.id === selectedId))}
                    activeIndex={isPlaying ? activeIndex : null}
                    accidental={accidental}
                    height={80}
                    onSelectIndex={(idx) => {
                      if (allChords[idx]) setSelectedId(allChords[idx].id)
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Hero Progression Editor (Spacious, Zero Clipping) */}
          <div className={cn("flex-1 overflow-y-auto p-2 sm:p-4 md:p-5 min-h-0", mobileTab !== "progression" && "hidden lg:block")}>
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
              onImportSong={onImportSong}
              twoHanded={twoHanded}
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>

          {/* Virtual Piano Dock (Desktop Collapsible) */}
          {/* Unified Instrument Deck (Virtual Piano & Guitar Fretboard) */}
          <div className="hidden lg:block shrink-0 border-t border-border/80 bg-card/60 backdrop-blur-md transition-all duration-200">
            <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 border-b border-border/40">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowKeyboard((v) => !v)
                    onTogglePiano?.()
                  }}
                  className="flex items-center gap-1.5 font-mono text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Piano className="size-3.5 text-primary" />
                  <span>Instrument Visualizer</span>
                  <span className="text-[10px] text-amber-400 font-normal">({showKeyboard ? "Open" : "Collapsed"})</span>
                </button>

                {/* Sub-toggle: Piano vs Guitar */}
                <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setBottomDeckView("piano")
                      if (!showKeyboard) {
                        setShowKeyboard(true)
                        onTogglePiano?.()
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer transition-all",
                      bottomDeckView === "piano"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    88-Key Piano
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBottomDeckView("guitar")
                      if (!showKeyboard) {
                        setShowKeyboard(true)
                        onTogglePiano?.()
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer transition-all",
                      bottomDeckView === "guitar"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Guitar Fretboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBottomDeckView("voice-leading")
                      if (!showKeyboard) {
                        setShowKeyboard(true)
                        onTogglePiano?.()
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer transition-all",
                      bottomDeckView === "voice-leading"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Voice Leading
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {bottomDeckView === "piano" ? (
                  <button
                    type="button"
                    onClick={() => setTwoHanded((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 font-mono text-[11px] font-bold transition-all cursor-pointer",
                      twoHanded
                        ? "border-cyan-400/80 bg-cyan-400/15 text-cyan-300 shadow-xs"
                        : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title="Toggle 2-Handed Mode (adds Left Hand chord transposed 1 octave lower)"
                  >
                    <Layers className="size-3" />
                    <span>2-Handed ({twoHanded ? "ON" : "OFF"})</span>
                  </button>
                ) : bottomDeckView === "guitar" ? (
                  <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                    Interactive CAGED chord shapes &amp; Capo simulator
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                    SATB Step Motion &amp; Smoothness Engine
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowShortcuts(true)}
                  className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg border border-border/70 bg-background/50 font-mono text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer shadow-xs"
                  title="Keyboard shortcuts guide (?)"
                >
                  <Keyboard className="size-3 text-amber-400" />
                  <span>Shortcuts</span>
                  <kbd className="text-[9px] bg-muted px-1 rounded">?</kbd>
                </button>
              </div>
            </div>
            {showKeyboard && (
              <div className="p-2">
                {bottomDeckView === "piano" ? (
                  <PianoKeyboard
                    activeMidis={activeMidis}
                    rootMidi={rootMidi}
                    bassMidi={bassMidi}
                    accidental={accidental}
                    twoHanded={twoHanded}
                    satbVoiceMap={satbVoiceMap}
                  />
                ) : bottomDeckView === "guitar" ? (
                  <GuitarFretboard
                    chord={isPlaying && parsedDisplayed ? parsedDisplayed : parsedSelected}
                  />
                ) : (
                  <div className="p-2">
                    <VoiceLeadingRibbon
                      currentChord={displayedEntry ?? selectedEntry}
                      nextChord={nextChordEntry}
                      accidental={accidental}
                      voicingStyle={(displayedEntry ?? selectedEntry)?.voicingStyle as any ?? "close"}
                      onAutoVoiceSection={() => activeSectionId && handleAutoVoiceSection(activeSectionId)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* Mobile Dedicated Piano View (< lg only) */}
        <div
          className={cn(
            "flex-1 flex flex-col w-full h-full p-3 overflow-y-auto bg-card/40 backdrop-blur-md shrink-0",
            mobileTab === "piano" ? "flex" : "hidden",
          )}
        >
          <div className="mb-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Piano className="size-5 text-primary" />
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Interactive Keyboard
                </h3>
                <p className="text-[10px] text-zinc-400">Hear voicings and touch keys directly</p>
              </div>
              <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBottomDeckView("piano")}
                  className={cn(
                    "px-2 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer",
                    bottomDeckView === "piano" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400"
                  )}
                >
                  Piano
                </button>
                <button
                  type="button"
                  onClick={() => setBottomDeckView("guitar")}
                  className={cn(
                    "px-2 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer",
                    bottomDeckView === "guitar" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400"
                  )}
                >
                  Guitar
                </button>
                <button
                  type="button"
                  onClick={() => setBottomDeckView("voice-leading")}
                  className={cn(
                    "px-2 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer",
                    bottomDeckView === "voice-leading" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400"
                  )}
                >
                  Voice
                </button>
              </div>
            </div>
            {bottomDeckView === "piano" && (
              <button
                type="button"
                onClick={() => setTwoHanded((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold transition-all cursor-pointer",
                  twoHanded
                    ? "border-cyan-400/80 bg-cyan-400/15 text-cyan-300"
                    : "border-border/60 bg-background/50 text-muted-foreground",
                )}
              >
                <Layers className="size-3" />
                <span>2-Handed ({twoHanded ? "ON" : "OFF"})</span>
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center py-2">
            {bottomDeckView === "piano" ? (
              <PianoKeyboard
                activeMidis={activeMidis}
                rootMidi={rootMidi}
                bassMidi={bassMidi}
                accidental={accidental}
                twoHanded={twoHanded}
                satbVoiceMap={satbVoiceMap}
              />
            ) : bottomDeckView === "guitar" ? (
              <GuitarFretboard
                chord={isPlaying && parsedDisplayed ? parsedDisplayed : parsedSelected}
              />
            ) : (
              <VoiceLeadingRibbon
                currentChord={displayedEntry ?? selectedEntry}
                nextChord={nextChordEntry}
                accidental={accidental}
                voicingStyle={(displayedEntry ?? selectedEntry)?.voicingStyle as any ?? "close"}
                onAutoVoiceSection={() => activeSectionId && handleAutoVoiceSection(activeSectionId)}
              />
            )}
          </div>
        </div>

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
            voicingStyle={selectedEntry?.voicingStyle as any ?? "close"}
            onVoicingStyleChange={(style) => {
              if (selectedId) handleUpdateChord(selectedId, { voicingStyle: style as any })
            }}
            octaveOffset={selectedEntry?.octaveOffset ?? 0}
            onOctaveOffsetChange={(offset) => {
              if (selectedId) handleUpdateChord(selectedId, { octaveOffset: offset })
            }}
          />
        </div>
      </div>

      {/* Mobile DAW Bottom Navigation Bar (< lg only) */}
      <nav className="flex lg:hidden items-center justify-around border-t border-border/80 bg-card/95 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-xl shrink-0 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setMobileTab("progression")}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer touch-manipulation",
            mobileTab === "progression"
              ? "text-foreground font-black scale-105 bg-white/10 shadow-xs"
              : "text-zinc-400 hover:text-foreground",
          )}
        >
          <Music4 className="size-4" />
          <span className="font-mono text-[10px] tracking-tight">Chords</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("piano")}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer touch-manipulation",
            mobileTab === "piano"
              ? "text-foreground font-black scale-105 bg-white/10 shadow-xs"
              : "text-zinc-400 hover:text-foreground",
          )}
        >
          <Piano className="size-4" />
          <span className="font-mono text-[10px] tracking-tight">Piano</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("inspector")}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer touch-manipulation",
            mobileTab === "inspector"
              ? "text-foreground font-black scale-105 bg-white/10 shadow-xs"
              : "text-zinc-400 hover:text-foreground",
          )}
        >
          <Search className="size-4" />
          <span className="font-mono text-[10px] tracking-tight">Voice</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("sections")}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer touch-manipulation",
            mobileTab === "sections"
              ? "text-foreground font-black scale-105 bg-white/10 shadow-xs"
              : "text-zinc-400 hover:text-foreground",
          )}
        >
          <ListMusic className="size-4" />
          <span className="font-mono text-[10px] tracking-tight">Song</span>
        </button>
      </nav>

      {/* Fullscreen Overlays */}
      {isRehearsing && (
        <Suspense fallback={null}>
          <RehearsalMode
            song={song}
            isPlaying={isPlaying}
            activeIndex={isPlaying ? activeIndex : null}
            volume={volume}
            onVolumeChange={setVolume}
            onTogglePlay={togglePlay}
            onClose={() => setIsRehearsing(false)}
          />
        </Suspense>
      )}

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  )
}
