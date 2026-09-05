"use client"

import { useState } from "react"
import { Music4, Guitar, Presentation, X, Play, Sparkles, ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Song } from "@/lib/music/types"
import { cn } from "@/lib/utils"

interface SongHubModalProps {
  song: Song
  onSelectAction: (action: "edit" | "play-part" | "rehearse") => void
  triggerClassName?: string
}

export function SongHubModal({ song, onSelectAction, triggerClassName }: SongHubModalProps) {
  const [open, setOpen] = useState(false)

  const totalChords = song.sections.reduce((acc, s) => acc + s.chords.length, 0)

  const handleChoose = (action: "edit" | "play-part" | "rehearse") => {
    setOpen(false)
    onSelectAction(action)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 rounded-lg border border-border/80 bg-background/60 px-2 py-1 text-xs font-mono font-bold text-muted-foreground hover:border-amber-500/50 hover:text-foreground transition-all cursor-pointer shadow-xs shrink-0",
          triggerClassName,
        )}
        title="View Song Overview & Action Hub"
      >
        <Info className="size-3.5 text-amber-400" />
        <span className="hidden sm:inline text-[11px]">Song Hub</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg border border-zinc-800 bg-zinc-950/95 p-6 z-[100] rounded-2xl shadow-2xl space-y-5">
            {/* Modal Header: Song Identity */}
            <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-mono text-lg font-black shrink-0">
                  🎵
                </div>
                <div>
                  <h3 className="font-mono text-lg font-black tracking-tight text-white flex items-center gap-2">
                    {song.title || "Untitled Song"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold mt-0.5">
                    <span>{song.keyTonic} {song.keyMode}</span>
                    <span>•</span>
                    <span>{song.bpm} BPM</span>
                    <span>•</span>
                    <span className="text-zinc-400">{song.sections.length} Sections ({totalChords} Chords)</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                What do you want to do?
              </span>
            </div>

            {/* 3 Core Product Actions Cards */}
            <div className="space-y-3 font-mono">
              {/* Action 1: EDIT SONG */}
              <button
                type="button"
                onClick={() => handleChoose("edit")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-left transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center font-bold shrink-0">
                    <Music4 className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      EDIT SONG
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Chords • Sections • BPM • Keys & Transposition
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Action 2: PLAY YOUR PART */}
              <button
                type="button"
                onClick={() => handleChoose("play-part")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/90 text-left transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-zinc-800 border border-zinc-700 text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Guitar className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      PLAY YOUR PART
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Guitar Fretboard • Capo Positions • Piano • Solo Coach
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Action 3: REHEARSE */}
              <button
                type="button"
                onClick={() => handleChoose("rehearse")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold shrink-0">
                    <Presentation className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                      REHEARSE
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Full-Screen Practice Mode for Stage & Rehearsal
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 px-4 text-xs font-bold border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
