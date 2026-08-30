import { useState, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { MODULES } from "./modules"
import { ModulePlaceholder } from "./module-placeholder"
import { SongLab } from "@/components/song-lab/song-lab"
import { InstrumentLab } from "@/components/instrument-lab/instrument-lab"
import { SongLibraryBar } from "./song-library-bar"
import { useSongLibrary } from "@/hooks/use-song-library"
import { transposeSymbol, semitonesBetween } from "@/lib/music/transpose"
import { keyAccidental } from "@/lib/music/scales"

export function Workspace() {
  const [activeModule, setActiveModule] = useState("song-lab")
  const [showPiano, setShowPiano] = useState(true)
  const lib = useSongLibrary()

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

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar active={activeModule} onSelect={setActiveModule} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
          showPiano={showPiano}
          onTogglePiano={() => setShowPiano((v) => !v)}
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
                showPiano={showPiano}
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
    </div>
  )
}
