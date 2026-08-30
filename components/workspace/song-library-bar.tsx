"use client"

import { useState, useEffect } from "react"
import type { Song } from "@/lib/music/types"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreVertical, Trash2, Music, ChevronDown, ChevronUp, Piano } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { cn } from "@/lib/utils"

interface SongLibraryBarProps {
  songs: Song[]
  currentId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onTitleChange?: (title: string) => void
  onKeyChange?: (tonic: string) => void
  onModeChange?: (mode: "major" | "minor") => void
  onTranspose?: (semitones: number) => void
  showPiano?: boolean
  onTogglePiano?: () => void
}

export function SongLibraryBar({
  songs,
  currentId,
  onSelect,
  onCreate,
  onDelete,
  onTitleChange,
  onKeyChange,
  onModeChange,
  onTranspose,
  showPiano,
  onTogglePiano,
}: SongLibraryBarProps) {
  const currentSong = songs.find((s) => s.id === currentId) ?? songs[0]
  const tonics = currentSong?.keyMode === "minor" ? MINOR_TONICS : MAJOR_TONICS

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/70 px-2.5 sm:px-4 backdrop-blur-md gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
      {/* Left: Project Selector & Inline Title Edit */}
      <div className="flex items-center gap-2 min-w-0">
        <Select value={currentId ?? ""} onValueChange={(v) => v && onSelect(v)}>
          <SelectTrigger
            className="h-8.5 w-auto px-3 border-border/80 bg-background/60 font-semibold text-xs text-foreground hover:border-border transition-colors rounded-xl gap-2 cursor-pointer"
            aria-label="Select active song"
          >
            <Music className="size-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="font-mono text-[11px] text-muted-foreground">
              Tracks <span className="text-foreground font-bold">({songs.length})</span>
            </span>
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[240px]">
            {songs.map((s) => (
              <SelectItem key={s.id} value={s.id} className="cursor-pointer py-2 font-medium">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{s.title || "Untitled Song"}</span>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    {s.keyTonic} {s.keyMode === "major" ? "maj" : "min"}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onTitleChange && currentSong && (
          <Input
            value={currentSong.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="h-8.5 w-40 sm:w-56 border-border/60 bg-background/50 px-3 text-xs font-black text-foreground focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
            placeholder="Track title..."
            aria-label="Rename song track"
          />
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onCreate}
          className="h-8.5 gap-1.5 border-border/80 bg-background/50 text-xs font-semibold shadow-xs hover:border-primary/50 hover:bg-primary/5 rounded-xl px-2.5 cursor-pointer"
          aria-label="Create new song"
        >
          <Plus className="size-3.5 text-primary" aria-hidden="true" />
          <span className="hidden md:inline">New</span>
        </Button>
      </div>

      {/* Center: Key & Transpose Controls */}
      {currentSong && onKeyChange && onModeChange && onTranspose && (
        <div className="hidden lg:flex items-center gap-2">
          {/* Key Tonic Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/50 p-1 shadow-xs">
            <span className="px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Key
            </span>
            <Select value={currentSong.keyTonic} onValueChange={(v) => v && onKeyChange(v)}>
              <SelectTrigger className="h-7 w-14 border-0 bg-muted/60 font-mono text-xs font-black hover:bg-muted rounded-lg" aria-label="Key tonic">
                <span>{currentSong.keyTonic}</span>
              </SelectTrigger>
              <SelectContent className="max-h-72 font-mono">
                {tonics.map((t) => (
                  <SelectItem key={t} value={t} className="font-mono text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mode Toggle (maj / min) */}
            <div className="flex h-7 overflow-hidden rounded-lg bg-muted/40 p-0.5" role="radiogroup" aria-label="Key mode">
              {(["major", "minor"] as const).map((m) => {
                const active = currentSong.keyMode === m
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onModeChange(m)}
                    className={cn(
                      "rounded px-2 text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "major" ? "maj" : "min"}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Transpose Steppers */}
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/50 p-1 shadow-xs">
            <span className="px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Transpose
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg hover:bg-muted cursor-pointer"
              onClick={() => onTranspose(-1)}
              aria-label="Transpose down 1 semitone"
              title="Transpose down 1 semitone"
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg hover:bg-muted cursor-pointer"
              onClick={() => onTranspose(1)}
              aria-label="Transpose up 1 semitone"
              title="Transpose up 1 semitone"
            >
              <ChevronUp className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Right: Piano Toggle + Autosave Pill + Options */}
      <div className="flex items-center gap-2">
        {onTogglePiano && (
          <Button
            variant={showPiano ? "default" : "outline"}
            size="sm"
            onClick={onTogglePiano}
            className={cn(
              "h-8.5 gap-1.5 rounded-xl px-2.5 text-xs font-semibold shadow-xs cursor-pointer",
              !showPiano && "border-border/80 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            title="Toggle Virtual Piano Keyboard (P)"
          >
            <Piano className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Piano</span>
          </Button>
        )}

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 select-none shadow-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="hidden md:inline">Autosaved</span>
        </div>

        {currentId && songs.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Song options menu"
              className="inline-flex size-8.5 items-center justify-center rounded-xl border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => currentId && onDelete(currentId)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Delete track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
