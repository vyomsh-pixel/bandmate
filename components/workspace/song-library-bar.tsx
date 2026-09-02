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
import { Plus, MoreVertical, Trash2, Music, ChevronDown, ChevronUp, Piano, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { cn } from "@/lib/utils"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"
import { MODULES } from "./modules"

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
  activeModule?: string
  onSelectModule?: (id: string) => void
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
  activeModule = "song-lab",
  onSelectModule,
}: SongLibraryBarProps) {
  const currentSong = songs.find((s) => s.id === currentId) ?? songs[0]
  const tonics = currentSong?.keyMode === "minor" ? MINOR_TONICS : MAJOR_TONICS
  const currentModule = MODULES.find((m) => m.id === activeModule) ?? MODULES[0]
  const activeModules = MODULES.filter((m) => m.available)
  const upcomingModules = MODULES.filter((m) => !m.available)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/70 px-2.5 sm:px-4 backdrop-blur-md gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
      {/* Left: Studio Module Menu + Project Selector + Title Edit */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Studio Brand & Module Switcher Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-2.5 py-1 text-xs font-bold shadow-xs hover:border-primary/50 hover:bg-muted/80 transition-all cursor-pointer shrink-0 group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Open Workspace Modules Menu"
              title="Switch Studio Module or View Roadmap"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-xs group-hover:scale-105 transition-transform">
                <TrebleClefIcon className="size-4.5 fill-current" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="font-mono text-xs font-black tracking-tight text-foreground flex items-center gap-1">
                  BandMate
                </span>
                <span className="text-[10px] font-semibold text-primary font-mono uppercase">
                  {currentModule.name}
                </span>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2 z-50">
            <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Studio Modules
            </div>
            {activeModules.map((mod) => {
              const Icon = mod.icon
              const isActive = mod.id === activeModule
              return (
                <DropdownMenuItem
                  key={mod.id}
                  onClick={() => onSelectModule?.(mod.id)}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors mb-1",
                    isActive ? "bg-primary/15 text-primary" : "hover:bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0 mt-0.5",
                      isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{mod.name}</span>
                      {isActive && (
                        <Badge variant="default" className="text-[9px] font-mono px-1.5 py-0 h-4 bg-primary text-primary-foreground">
                          Active
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{mod.description}</span>
                  </div>
                </DropdownMenuItem>
              )
            })}

            <div className="my-1.5 h-px bg-border/60" />

            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Roadmap
              </span>
              <span className="text-[9px] opacity-70">Coming Soon</span>
            </div>

            {upcomingModules.map((mod) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.id}
                  className="flex items-start gap-2.5 p-2 rounded-xl opacity-60 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-xs">
                        Phase {mod.phase}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{mod.description}</span>
                  </div>
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border/60 shrink-0" />

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
            className="h-8.5 w-28 sm:w-48 md:w-56 border-border/60 bg-background/50 px-2.5 sm:px-3 text-xs font-black text-foreground focus-visible:ring-1 focus-visible:ring-primary rounded-xl shrink-0"
            placeholder="Track title..."
            aria-label="Rename song track"
          />
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onCreate}
          className="h-8.5 gap-1.5 border-border/80 bg-background/50 text-xs font-semibold shadow-xs hover:border-primary/50 hover:bg-primary/5 rounded-xl px-2.5 cursor-pointer shrink-0"
          aria-label="Create new song"
        >
          <Plus className="size-3.5 text-primary" aria-hidden="true" />
          <span className="hidden md:inline">New</span>
        </Button>
      </div>

      {/* Center: Key & Transpose Controls (Accessible on Mobile & Desktop) */}
      {currentSong && onKeyChange && onModeChange && onTranspose && (
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Key Tonic Selector */}
          <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border/80 bg-background/50 p-0.5 sm:p-1 shadow-xs">
            <span className="hidden sm:inline px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Key
            </span>
            <Select value={currentSong.keyTonic} onValueChange={(v) => v && onKeyChange(v)}>
              <SelectTrigger className="h-7 w-12 sm:w-14 border-0 bg-muted/60 font-mono text-xs font-black hover:bg-muted rounded-lg px-1.5" aria-label="Key tonic">
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
                      "rounded px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer touch-manipulation",
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
          <div className="flex items-center gap-0.5 sm:gap-1 rounded-xl border border-border/80 bg-background/50 p-0.5 sm:p-1 shadow-xs">
            <span className="hidden md:inline px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Transpose
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg hover:bg-muted cursor-pointer touch-manipulation"
              onClick={() => onTranspose(-1)}
              aria-label="Transpose down 1 semitone"
              title="Transpose down 1 semitone"
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg hover:bg-muted cursor-pointer touch-manipulation"
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
