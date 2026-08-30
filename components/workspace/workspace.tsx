"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { MODULES } from "./modules"
import { ModulePlaceholder } from "./module-placeholder"
import { SongLab } from "@/components/song-lab/song-lab"
import { InstrumentLab } from "@/components/instrument-lab/instrument-lab"
import { SongLibraryBar } from "./song-library-bar"
import { useSongLibrary } from "@/hooks/use-song-library"

export function Workspace() {
  const [activeModule, setActiveModule] = useState("song-lab")
  const lib = useSongLibrary()

  const current = MODULES.find((m) => m.id === activeModule) ?? MODULES[0]

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar active={activeModule} onSelect={setActiveModule} />

      <main className="flex min-w-0 flex-1 flex-col">
        {activeModule === "song-lab" ? (
          <>
            <SongLibraryBar
              songs={lib.songs}
              currentId={lib.currentId}
              onSelect={lib.selectSong}
              onCreate={() => lib.createSong()}
              onDelete={lib.deleteSong}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {lib.loaded && lib.currentSong ? (
                <SongLab 
                  song={lib.currentSong} 
                  onUpdate={lib.updateSong} 
                  undo={lib.undo}
                  redo={lib.redo}
                  canUndo={lib.canUndo}
                  canRedo={lib.canRedo}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading studio…
                </div>
              )}
            </div>
          </>
        ) : activeModule === "instrument-lab" ? (
          <>
            <SongLibraryBar
              songs={lib.songs}
              currentId={lib.currentId}
              onSelect={lib.selectSong}
              onCreate={() => lib.createSong()}
              onDelete={lib.deleteSong}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {lib.loaded && lib.currentSong ? (
                <InstrumentLab song={lib.currentSong} onUpdate={lib.updateSong} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading studio…
                </div>
              )}
            </div>
          </>
        ) : (
          <ModulePlaceholder module={current} />
        )}
      </main>
    </div>
  )
}
