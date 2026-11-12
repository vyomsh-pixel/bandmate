"use client"

import { useState, useMemo, useEffect } from "react"
import {
  ListMusic,
  Plus,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  Clock,
  Music2,
  Sparkles,
  ChevronRight,
  FolderPlus,
  ExternalLink,
} from "lucide-react"
import type { Song, Setlist } from "@/lib/music/types"
import { calculateSongDurationSeconds, formatDuration } from "@/lib/music/types"
import { semitonesBetween } from "@/lib/music/transpose"
import { loadUserSetlists, saveUserSetlists } from "@/lib/storage/cloud-sync"
import { createId } from "@/lib/storage/local-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SetlistsViewProps {
  songs: Song[]
  userId: string
  onSelectSong: (songId: string) => void
  onOpenSongLab: (songId: string) => void
}

function getKeyTransitionAdvice(prevSong: Song, nextSong: Song): string {
  if (prevSong.keyTonic === nextSong.keyTonic && prevSong.keyMode === nextSong.keyMode) {
    return "Same key: seamless continuation"
  }
  const diff = (semitonesBetween(prevSong.keyTonic, nextSong.keyTonic) + 12) % 12
  if (diff === 7 || diff === 5) {
    return "Adjacent on Circle of 5ths: natural harmonic transition"
  }
  if (diff === 2) {
    return "Step up (+2 st): uplifting energy boost"
  }
  if (prevSong.keyMode !== nextSong.keyMode && diff === 0) {
    return "Parallel Major/Minor switch: dramatic mood change"
  }
  return `${diff} semitones shift`
}

export function SetlistsView({
  songs,
  userId,
  onSelectSong,
  onOpenSongLab,
}: SetlistsViewProps) {
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null)
  const [newSetlistName, setNewSetlistName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Load setlists on mount or userId change
  useEffect(() => {
    const loaded = loadUserSetlists(userId)
    if (loaded.length === 0) {
      // Create initial starter setlist
      const initial: Setlist = {
        id: createId(),
        name: "Main Show Setlist",
        description: "Rehearsal and performance order",
        songIds: songs.slice(0, 3).map((s) => s.id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setSetlists([initial])
      setActiveSetlistId(initial.id)
      saveUserSetlists(userId, [initial])
    } else {
      setSetlists(loaded)
      setActiveSetlistId(loaded[0]?.id ?? null)
    }
  }, [userId, songs])

  const activeSetlist = setlists.find((s) => s.id === activeSetlistId) ?? setlists[0] ?? null

  const activeSongs = useMemo(() => {
    if (!activeSetlist) return []
    return activeSetlist.songIds
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is Song => Boolean(s))
  }, [activeSetlist, songs])

  const totalRuntimeSeconds = useMemo(() => {
    return activeSongs.reduce((acc, song) => acc + calculateSongDurationSeconds(song), 0)
  }, [activeSongs])

  const availableSongsToAdd = useMemo(() => {
    if (!activeSetlist) return []
    const used = new Set(activeSetlist.songIds)
    return songs.filter((s) => !used.has(s.id))
  }, [activeSetlist, songs])

  const handleCreateSetlist = () => {
    if (!newSetlistName.trim()) return
    const newSet: Setlist = {
      id: createId(),
      name: newSetlistName.trim(),
      description: "Custom setlist",
      songIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updated = [newSet, ...setlists]
    setSetlists(updated)
    setActiveSetlistId(newSet.id)
    saveUserSetlists(userId, updated)
    setNewSetlistName("")
    setIsCreating(false)
    toast.success(`Created setlist "${newSet.name}"`)
  }

  const handleDeleteSetlist = (id: string) => {
    if (setlists.length <= 1) {
      toast.error("You must have at least one setlist")
      return
    }
    const updated = setlists.filter((s) => s.id !== id)
    setSetlists(updated)
    setActiveSetlistId(updated[0]?.id ?? null)
    saveUserSetlists(userId, updated)
    toast.success("Setlist removed")
  }

  const handleAddSongToSetlist = (songId: string) => {
    if (!activeSetlist) return
    const updated = setlists.map((s) =>
      s.id === activeSetlist.id
        ? { ...s, songIds: [...s.songIds, songId], updatedAt: Date.now() }
        : s,
    )
    setSetlists(updated)
    saveUserSetlists(userId, updated)
    toast.success("Song added to setlist")
  }

  const handleRemoveSongFromSetlist = (songId: string) => {
    if (!activeSetlist) return
    const updated = setlists.map((s) =>
      s.id === activeSetlist.id
        ? { ...s, songIds: s.songIds.filter((id) => id !== songId), updatedAt: Date.now() }
        : s,
    )
    setSetlists(updated)
    saveUserSetlists(userId, updated)
  }

  const handleMoveSong = (index: number, direction: -1 | 1) => {
    if (!activeSetlist) return
    const nextIdx = index + direction
    if (nextIdx < 0 || nextIdx >= activeSetlist.songIds.length) return
    const ids = [...activeSetlist.songIds]
    const temp = ids[index]
    ids[index] = ids[nextIdx]
    ids[nextIdx] = temp

    const updated = setlists.map((s) =>
      s.id === activeSetlist.id ? { ...s, songIds: ids, updatedAt: Date.now() } : s,
    )
    setSetlists(updated)
    saveUserSetlists(userId, updated)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      {/* Left Column: Setlists Drawer */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border/80 bg-zinc-950/60 p-3 sm:p-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="size-5 text-amber-400" />
            <h2 className="font-mono text-sm font-black uppercase tracking-wider text-white">
              Setlists
            </h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating((v) => !v)}
            className="h-7 px-2 font-mono text-xs font-bold text-amber-300 hover:bg-amber-400/10 gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>New</span>
          </Button>
        </div>

        {isCreating && (
          <div className="flex items-center gap-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-md">
            <Input
              value={newSetlistName}
              onChange={(e) => setNewSetlistName(e.target.value)}
              placeholder="e.g. Festival Headliner..."
              className="h-7 text-xs bg-background/80"
              onKeyDown={(e) => e.key === "Enter" && handleCreateSetlist()}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCreateSetlist}
              className="h-7 px-2.5 text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              Add
            </Button>
          </div>
        )}

        {/* Setlists List */}
        <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto no-scrollbar">
          {setlists.map((s) => {
            const isActive = s.id === activeSetlist?.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSetlistId(s.id)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl font-mono text-xs transition-all cursor-pointer text-left shrink-0 lg:shrink",
                  isActive
                    ? "bg-amber-400/15 text-amber-300 border border-amber-400/40 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <ListMusic className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{s.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] ml-2 shrink-0",
                    isActive ? "border-amber-400/40 text-amber-300" : "border-zinc-800 text-zinc-500",
                  )}
                >
                  {s.songIds.length} tracks
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Right Stage: Active Setlist Details & Ordering */}
      <div className="flex-1 flex flex-col bg-card/40 min-w-0 overflow-y-auto p-3 sm:p-6">
        {activeSetlist ? (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
            {/* Header: Setlist Title, Runtime, Delete */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{activeSetlist.name}</span>
                  <Badge variant="outline" className="font-mono text-xs border-amber-400/40 text-amber-400">
                    {activeSongs.length} Songs
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drag and reorder tracks to optimize key flow and show momentum
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Total Runtime Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-zinc-950/80 font-mono text-xs text-zinc-200">
                  <Clock className="size-3.5 text-amber-400" />
                  <span>Est. Set Time:</span>
                  <strong className="text-amber-400 font-black">{formatDuration(totalRuntimeSeconds)}</strong>
                </div>

                {setlists.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSetlist(activeSetlist.id)}
                    className="size-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    title="Delete setlist"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Song Track Cards in Setlist */}
            <div className="flex flex-col gap-2.5">
              {activeSongs.map((song, idx) => {
                const duration = calculateSongDurationSeconds(song)
                const nextSong = activeSongs[idx + 1]
                const transitionAdvice = nextSong ? getKeyTransitionAdvice(song, nextSong) : null

                return (
                  <div key={`${song.id}-${idx}`} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-all shadow-md group">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Position Number */}
                        <div className="size-7 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center font-mono text-xs font-black text-amber-400 shrink-0">
                          {idx + 1}
                        </div>

                        {/* Song Details */}
                        <div className="min-w-0">
                          <h3 className="font-mono text-sm font-bold text-white truncate flex items-center gap-2">
                            <span>{song.title || "Untitled Song"}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono text-amber-300 border-amber-400/30 bg-amber-400/10"
                            >
                              {song.keyTonic} {song.keyMode}
                            </Badge>
                          </h3>
                          <p className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>{song.bpm} BPM</span>
                            <span>•</span>
                            <span>{song.sections.length} Sections</span>
                            <span>•</span>
                            <span className="text-zinc-300 font-semibold">{formatDuration(duration)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Move Up / Down */}
                        <div className="flex items-center border border-zinc-800 rounded-lg bg-zinc-950 p-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSong(idx, -1)}
                            className="size-6 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move track earlier"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeSongs.length - 1}
                            onClick={() => handleMoveSong(idx, 1)}
                            className="size-6 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move track later"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>

                        {/* Open in Song Lab Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onSelectSong(song.id)
                            onOpenSongLab(song.id)
                          }}
                          className="h-8 px-2.5 font-mono text-xs font-bold border-zinc-700 bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 gap-1 cursor-pointer"
                        >
                          <Play className="size-3 fill-current text-amber-400" />
                          <span>Open Lab</span>
                        </Button>

                        {/* Remove from Setlist */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSongFromSetlist(song.id)}
                          className="size-8 flex items-center justify-center text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Remove from this setlist"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Harmonic Key Flow Connection Line */}
                    {transitionAdvice && (
                      <div className="flex items-center gap-2 pl-6 pr-4 py-1 text-[10px] font-mono text-zinc-400">
                        <div className="w-3 h-px bg-zinc-700" />
                        <Sparkles className="size-3 text-amber-400 shrink-0" />
                        <span className="truncate">{transitionAdvice}</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {activeSongs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed border-zinc-800 rounded-2xl p-6">
                  <Music2 className="size-8 text-amber-400/40 mb-2" />
                  <p className="font-bold text-white text-sm">Setlist is empty</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Add tracks from your song catalog below to build your live performance set.
                  </p>
                </div>
              )}
            </div>

            {/* Catalog Add Section */}
            {availableSongsToAdd.length > 0 && (
              <div className="mt-4 border-t border-border/80 pt-4 flex flex-col gap-2.5">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Available Songs in Your Library ({availableSongsToAdd.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSongsToAdd.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold text-white truncate block">
                          {song.title || "Untitled Song"}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {song.keyTonic} {song.keyMode} • {song.bpm} BPM
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddSongToSetlist(song.id)}
                        className="h-7 px-2 text-xs font-bold text-amber-300 hover:bg-amber-400/10 cursor-pointer shrink-0"
                      >
                        <Plus className="size-3 mr-1" />
                        <span>Add</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
