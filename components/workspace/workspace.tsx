"use client"

import { useState, useCallback, useEffect, lazy, Suspense } from "react"
import { MODULES } from "./modules"
import { ModulePlaceholder } from "./module-placeholder"
import { SongLab } from "@/components/song-lab/song-lab"
import { SongLibraryBar } from "./song-library-bar"
import { useSongLibrary } from "@/hooks/use-song-library"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"
import type { ParsedSongResult } from "@/lib/music/song-parser"
import { transposeSymbol, semitonesBetween } from "@/lib/music/transpose"
import { keyAccidental, MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { noteNameToPc, pcToName } from "@/lib/music/notes"
import { LegalModal, type LegalDocType } from "@/components/auth/legal-modals"
import { lockStudioSession } from "@/components/auth/studio-gate"
import { Lock } from "lucide-react"

const InstrumentLab = lazy(() =>
  import("@/components/instrument-lab/instrument-lab").then((m) => ({ default: m.InstrumentLab })),
)

/** Pick the tonic spelling (from the mode's option list) for a pitch class. */
export function tonicForPc(pc: number, mode: "major" | "minor"): string {
  const list = mode === "major" ? MAJOR_TONICS : MINOR_TONICS
  const match = list.find((t) => noteNameToPc(t) === ((pc % 12) + 12) % 12)
  return match ?? pcToName(pc, "sharp")
}

export function Workspace() {
  const [activeModule, setActiveModule] = useState("song-lab")
  const [showPiano, setShowPiano] = useState(false)
  const [showInspector, setShowInspector] = useState(true)
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null)
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
      const currentPc = noteNameToPc(lib.currentSong.keyTonic) ?? 0
      const newPc = (((currentPc + semitones) % 12) + 12) % 12
      const newTonic = tonicForPc(newPc, lib.currentSong.keyMode)
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
      const newAccidental = keyAccidental(newTonic, lib.currentSong.keyMode)
      const newSections = lib.currentSong.sections.map((s) => ({
        ...s,
        chords: s.chords.map((c) => ({ ...c, symbol: transposeSymbol(c.symbol, shift, newAccidental) })),
      }))
      lib.updateSong(lib.currentSong.id, { keyTonic: newTonic, sections: newSections })
    },
    [lib],
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
                onTogglePiano={() => setShowPiano((v) => !v)}
                showInspector={showInspector}
                onToggleInspector={() => setShowInspector((v) => !v)}
              />
            ) : activeModule === "instrument-lab" ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                    Loading Guitar Workspace…
                  </div>
                }
              >
                <InstrumentLab song={lib.currentSong} onUpdate={lib.updateSong} />
              </Suspense>
            ) : (
              <ModulePlaceholder module={current} />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading studio…
            </div>
          )}
        </div>

        {/* Persistent Subtle Studio Disclaimer & Governance Footer */}
        <footer className="hidden sm:flex items-center justify-between border-t border-border/60 bg-card/70 px-4 py-1 text-[10px] font-mono text-muted-foreground shrink-0">
          <span className="truncate">
            BandMate Studio — Harmonic analysis, voice-leading &amp; chord suggestions are creative studio aids · Local Vault &amp; IndexedDB Audio Cache
          </span>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setLegalDoc("privacy")}
              className="hover:text-amber-400 underline underline-offset-2 cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setLegalDoc("terms")}
              className="hover:text-amber-400 underline underline-offset-2 cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={lockStudioSession}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-amber-400 cursor-pointer font-bold"
              title="Lock Studio & return to Pre-Entry Gate"
            >
              <Lock className="size-2.5" />
              <span>Lock Studio</span>
            </button>
          </div>
        </footer>
      </main>

      <LegalModal
        openType={legalDoc}
        onClose={() => setLegalDoc(null)}
        onSwitchType={(next) => setLegalDoc(next)}
      />
    </div>
  )
}
