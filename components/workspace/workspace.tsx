"use client"

import { useState, useCallback, useEffect } from "react"
import { MODULES } from "./modules"
import { ModulePlaceholder } from "./module-placeholder"
import { SongLab } from "@/components/song-lab/song-lab"
import { InstrumentLab } from "@/components/instrument-lab/instrument-lab"
import { SongLibraryBar } from "./song-library-bar"
import { RehearsalMode } from "@/components/song-lab/rehearsal-mode"
import { useSongLibrary } from "@/hooks/use-song-library"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"
import type { ParsedSongResult } from "@/lib/music/song-parser"
import { transposeSymbol, semitonesBetween } from "@/lib/music/transpose"
import { keyAccidental } from "@/lib/music/scales"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { parseChord } from "@/lib/music/chord-parser"
import { voiceChord, playableVoicing } from "@/lib/music/chords"

export function Workspace() {
  const [activeModule, setActiveModule] = useState("song-lab")
  const [showPiano, setShowPiano] = useState(false)
  const [showInspector, setShowInspector] = useState(true)
  const [isRehearsing, setIsRehearsing] = useState(false)
  const [isPlayingRehearsal, setIsPlayingRehearsal] = useState(false)
  const [rehearsalActiveIndex, setRehearsalActiveIndex] = useState<number | null>(null)
  const [rehearsalVolume, setRehearsalVolume] = useState(0.85)

  const { user } = useAuth()
  const lib = useSongLibrary(user?.uid ?? "guest-user")

  // On desktop screens (>= 1024px), show piano by default; on mobile, keep collapsed for maximum space
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setShowPiano(true)
      setShowInspector(true)
    }
  }, [])

  const current = MODULES.find((m) => m.id === activeModule) ?? MODULES[0]

  const handleTranspose = useCallback(
    (semitones: number) => {
      if (!lib.currentSong) return
      const accidental = keyAccidental(lib.currentSong.keyTonic, lib.currentSong.keyMode)
      const newTonic = transposeSymbol(lib.currentSong.keyTonic, semitones, accidental)
      const newAccidental = keyAccidental(newTonic, lib.currentSong.keyMode)
      const newSections = lib.currentSong.sections.map((s) => ({
        ...s,
        chords: s.chords.map((c) => ({ ...c, symbol: transposeSymbol(c.symbol, semitones, newAccidental) })),
      }))
      lib.updateSong(lib.currentSong.id, { keyTonic: newTonic, sections: newSections })
    },
    [lib],
  )

  const handleKeyChange = useCallback(
    (newTonic: string) => {
      if (!lib.currentSong) return
      const shift = semitonesBetween(lib.currentSong.keyTonic, newTonic)
      handleTranspose(shift)
    },
    [lib, handleTranspose],
  )

  const handleImportSong = useCallback(
    (data: ParsedSongResult) => {
      lib.createSong({
        title: data.title,
        keyTonic: data.keyTonic,
        keyMode: data.keyMode,
        bpm: data.bpm,
        beatsPerBar: data.beatsPerBar,
        sections: data.sections,
      })
      toast.success(`Loaded "${data.title}" into Song Lab!`)
    },
    [lib],
  )

  const handleToggleRehearsalPlay = useCallback(() => {
    const engine = getAudioEngine()
    if (isPlayingRehearsal) {
      engine.stop()
      setIsPlayingRehearsal(false)
      setRehearsalActiveIndex(null)
      return
    }

    if (!lib.currentSong) return

    const flatChords = lib.currentSong.sections.flatMap((sec) =>
      sec.chords.map((c) => {
        const parsed = parseChord(c.symbol)
        const voiced = parsed ? voiceChord(parsed) : null
        const playable = voiced ? playableVoicing(voiced) : [60, 64, 67]
        return { midis: playable, beats: c.beats }
      })
    )

    engine.setMasterVolume(rehearsalVolume)
    engine.start(
      {
        bpm: lib.currentSong.bpm,
        beatsPerBar: lib.currentSong.beatsPerBar,
        chords: flatChords,
        loop: true,
        metronome: true,
        rhythm: "pulse",
      },
      ({ chordIndex }) => {
        setRehearsalActiveIndex(chordIndex)
      },
      () => {
        setIsPlayingRehearsal(false)
        setRehearsalActiveIndex(null)
      }
    )
    setIsPlayingRehearsal(true)
  }, [isPlayingRehearsal, lib.currentSong, rehearsalVolume])

  const handleCloseRehearsal = useCallback(() => {
    getAudioEngine().stop()
    setIsPlayingRehearsal(false)
    setRehearsalActiveIndex(null)
    setIsRehearsing(false)
  }, [])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden h-full">
        <SongLibraryBar
          songs={lib.songs}
          currentId={lib.currentId}
          onSelect={lib.selectSong}
          onCreate={() => lib.createSong()}
          onDelete={lib.deleteSong}
          onTitleChange={(title) => lib.currentSong && lib.updateSong(lib.currentSong.id, { title })}
          onKeyChange={handleKeyChange}
          onModeChange={(keyMode) => lib.currentSong && lib.updateSong(lib.currentSong.id, { keyMode })}
          onTranspose={handleTranspose}
          onImportSong={handleImportSong}
          showPiano={showPiano}
          onTogglePiano={() => setShowPiano((v) => !v)}
          showInspector={showInspector}
          onToggleInspector={() => setShowInspector((v) => !v)}
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          onToggleRehearsal={() => setIsRehearsing(true)}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {lib.loaded && lib.currentSong ? (
            activeModule === "song-lab" ? (
              <SongLab
                song={lib.currentSong}
                onUpdate={lib.updateSong}
                undo={lib.undo}
                redo={lib.redo}
                canUndo={lib.canUndo}
                canRedo={lib.canRedo}
                onImportSong={handleImportSong}
                showPiano={showPiano}
                showInspector={showInspector}
                onToggleInspector={() => setShowInspector((v) => !v)}
              />
            ) : activeModule === "instrument-lab" ? (
              <InstrumentLab song={lib.currentSong} onUpdate={lib.updateSong} />
            ) : (
              <ModulePlaceholder module={current} />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading studio…
            </div>
          )}
        </div>
      </main>

      {isRehearsing && lib.currentSong && (
        <RehearsalMode
          song={lib.currentSong}
          isPlaying={isPlayingRehearsal}
          activeIndex={rehearsalActiveIndex}
          volume={rehearsalVolume}
          onVolumeChange={(v) => {
            setRehearsalVolume(v)
            getAudioEngine().setMasterVolume(v)
          }}
          onTogglePlay={handleToggleRehearsalPlay}
          onClose={handleCloseRehearsal}
        />
      )}
    </div>
  )
}
