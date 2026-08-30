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
import { keyAccidental, MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { transposeProgression, transposeSymbol, semitonesBetween } from "@/lib/music/transpose"
import { midiToPc, noteNameToPc, pcToName } from "@/lib/music/notes"
import { getAudioEngine, type TransportConfig, type RhythmPattern } from "@/lib/audio/audio-engine"
import { AVAILABLE_INSTRUMENTS, type InstrumentId } from "@/lib/audio/soundfont-engine"
import { createId } from "@/lib/storage/local-store"
import type { ChordEntry, Section, Song } from "@/lib/music/types"
import { Button } from "@/components/ui/button"
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
}

/** Pick the tonic spelling (from the mode's option list) for a pitch class. */
function tonicForPc(pc: number, mode: "major" | "minor"): string {
  const list = mode === "major" ? MAJOR_TONICS : MINOR_TONICS
  const match = list.find((t) => noteNameToPc(t) === ((pc % 12) + 12) % 12)
  return match ?? pcToName(pc, "sharp")
}

export function SongLab({ song, onUpdate, undo, redo, canUndo, canRedo, showPiano = true }: SongLabProps) {
  const allChords = useMemo(() => song.sections.flatMap((s) => s.chords), [song.sections])

  const [selectedId, setSelectedId] = useState<string | null>(allChords[0]?.id ?? null)
  const [inversion, setInversion] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)
  const [metronome, setMetronome] = useState(true)
  const [loop, setLoop] = useState(true)
  const [volume, setVolume] = useState(0.85)
  const [instrument, setInstrumentState] = useState<InstrumentId>("acoustic_grand_piano")
  const [rhythm, setRhythm] = useState<RhythmPattern>("pulse")
  const [isRehearsing, setIsRehearsing] = useState(false)

  // Resizable panel dimensions
  const [leftWidth, setLeftWidth] = useState(210)
  const [rightWidth, setRightWidth] = useState(290)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)

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
      setInversion(0)
    }
  }, [allChords, selectedId])

  const selectedEntry = allChords.find((c) => c.id === selectedId) ?? null
  const parsedSelected = selectedEntry ? parseChord(selectedEntry.symbol) : null

  // Notes shown on the keyboard = selected chord voicing at the chosen inversion.
  const keyboardNotes = useMemo(() => {
    if (!parsedSelected?.valid) return []
    const root = voiceChord(parsedSelected, { octave: 4, accidental })
    return invertVoicing(root, inversion, accidental)
  }, [parsedSelected, inversion, accidental])

  const activeMidis = keyboardNotes.map((n) => n.midi)
  const rootMidi = parsedSelected?.valid
    ? activeMidis.find((m) => midiToPc(m) === parsedSelected.rootPc) ?? null
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
        const midis = parsed.valid ? playableVoicing(parsed, { octave: 4, accidental: acc }).map((n) => n.midi) : []
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
    await getAudioEngine().setInstrument(id)
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
      const midis = playableVoicing(parsedSelected, { octave: 4, accidental, inversion }).map((n) => n.midi)
      engine.playChord(midis, { duration: 1.4 })
    })
  }, [parsedSelected, accidental, inversion, volume])

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
    }
  })

  const handleAddSection = useCallback(
    (name: string) => {
      const newSec: Section = {
        id: createId(),
        name,
        chords: [{ id: createId(), symbol: song.keyTonic, beats: song.beatsPerBar }],
      }
      updateSections((sections) => [...sections, newSec])
      setSelectedId(newSec.chords[0].id)
      toast.success(`Added ${name} section`)
    },
    [updateSections, song.keyTonic, song.beatsPerBar],
  )

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Main Workspace Panels */}
      <div className={cn("flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0", (isDraggingLeft || isDraggingRight) && "select-none")}>
        {/* Left Panel: Sections / Navigator */}
        <div
          style={{ width: `${leftWidth}px` }}
          className="hidden lg:flex flex-col justify-between border-r border-border/80 bg-card/30 p-3 shrink-0 overflow-y-auto"
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
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs font-bold shadow-xs transition-colors hover:border-border hover:bg-muted"
                >
                  <span className="truncate">{sec.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {sec.chords.length} {sec.chords.length === 1 ? "chord" : "chords"}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Add Section Dropdown/Buttons */}
            <div className="mt-2.5 flex flex-wrap gap-1">
              {["Chorus", "Bridge", "Verse 2", "Outro"].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleAddSection(name)}
                  className="rounded-lg border border-dashed border-border px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary cursor-pointer"
                >
                  + {name}
                </button>
              ))}
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
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Transport Bar Header */}
          <div className="shrink-0 border-b border-border/80 bg-background/95 px-4 py-2 backdrop-blur-md shadow-xs z-10">
            <TransportBar
              isPlaying={isPlaying}
              bpm={song.bpm}
              beatsPerBar={song.beatsPerBar}
              currentBeat={currentBeat}
              loop={loop}
              metronome={metronome}
              volume={volume}
              instrument={instrument}
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
            <ProgressionEditor
              sections={song.sections}
              keyTonic={song.keyTonic}
              keyMode={song.keyMode}
              selectedId={selectedId}
              activeIndex={isPlaying ? activeIndex : null}
              onSelect={(id) => {
                setSelectedId(id)
                setInversion(0)
              }}
              onUpdate={handleUpdateChord}
              onRemove={handleRemoveChord}
              onMove={handleMoveChord}
              onAdd={handleAddChord}
              onDuplicate={handleDuplicateChord}
            />
          </div>

          {/* Virtual Piano Dock (Collapsible) */}
          {showPiano && (
            <div className="shrink-0 border-t border-border/80 bg-card/40 px-3 py-2 backdrop-blur-md">
              <PianoKeyboard activeMidis={activeMidis} rootMidi={rootMidi} accidental={accidental} />
            </div>
          )}
        </div>

        {/* Right Draggable Resizer */}
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

        {/* Right Panel: Inspector */}
        <div
          style={{ width: `${rightWidth}px` }}
          className="w-full lg:w-auto border-l border-border/80 lg:border-t-0 border-t bg-card/30 p-3.5 shrink-0 overflow-y-auto"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Inspector
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground/80">Chord Voice</span>
          </div>
          <ChordDetail
            chord={parsedSelected}
            accidental={accidental}
            inversion={inversion}
            onInversionChange={setInversion}
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
          onTogglePlay={togglePlay}
          onClose={() => setIsRehearsing(false)}
        />
      )}
    </div>
  )
}
