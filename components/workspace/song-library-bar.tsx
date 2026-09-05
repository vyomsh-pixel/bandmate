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
import { Plus, MoreVertical, Trash2, Music, ChevronDown, ChevronUp, Piano, Sparkles, PanelRight, Settings, Download, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { cn } from "@/lib/utils"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"
import { downloadMidi } from "@/lib/export/midi-export"
import { downloadLeadSheetText } from "@/lib/export/lead-sheet"
import { UserProfileButton } from "@/components/auth/user-profile-button"
import { MODULES } from "./modules"

import { SongImportModal } from "@/components/song-lab/song-import-modal"
import type { ParsedSongResult } from "@/lib/music/song-parser"

export interface SongLibraryBarProps {
  songs: Song[]
  currentId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onTitleChange?: (title: string) => void
  onKeyChange?: (tonic: string) => void
  onModeChange?: (mode: "major" | "minor") => void
  onTranspose?: (semitones: number) => void
  onImportSong?: (songData: ParsedSongResult) => void
  showPiano?: boolean
  onTogglePiano?: () => void
  showInspector?: boolean
  onToggleInspector?: () => void
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
  onImportSong,
  showPiano,
  onTogglePiano,
  showInspector,
  onToggleInspector,
  activeModule = "song-lab",
  onSelectModule,
}: SongLibraryBarProps) {
  const currentSong = songs.find((s) => s.id === currentId) ?? songs[0]
  const tonics = currentSong?.keyMode === "minor" ? MINOR_TONICS : MAJOR_TONICS
  const currentModule = MODULES.find((m) => m.id === activeModule) ?? MODULES[0]
  const activeModules = MODULES.filter((m) => m.available)
  const upcomingModules = MODULES.filter((m) => !m.available)

  return (
    <header className="flex h-12 md:h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/95 px-2.5 sm:px-4 backdrop-blur-md overflow-x-auto md:overflow-visible no-scrollbar">
      {/* ========================================================================= */}
      {/* MOBILE-ONLY HEADER (< md) — ZERO CLUTTER, SPACIOUS, 100% VISIBLE          */}
      {/* ========================================================================= */}
      <div className="flex md:hidden items-center justify-between w-full gap-2 min-w-0">
        {/* Brand + Current Song Dropdown Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/60 px-2.5 py-1 text-xs font-bold shadow-xs hover:border-primary/50 transition-all cursor-pointer min-w-0 max-w-[200px]"
              aria-label="Select song track"
            >
              <div className="size-6 shrink-0 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-xs">
                <TrebleClefIcon className="size-3.5 fill-current" />
              </div>
              <span className="font-mono text-xs font-black truncate text-foreground">
                {currentSong?.title || "Untitled Song"}
              </span>
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2 space-y-2 z-50">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Song Tracks ({songs.length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCreate}
                className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
              >
                <Plus className="size-3" />
                New
              </Button>
            </div>

            {onTitleChange && currentSong && (
              <div className="px-1">
                <Input
                  value={currentSong.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="h-7 border-border/60 bg-background/50 px-2 text-xs font-bold text-foreground"
                  placeholder="Rename song..."
                />
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {songs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors text-left",
                    s.id === currentId
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  <span className="truncate flex-1">{s.title || "Untitled Song"}</span>
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0 ml-1.5">
                    {s.keyTonic} {s.keyMode === "major" ? "maj" : "min"}
                  </Badge>
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right: Key Pill + User Profile + Settings Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <UserProfileButton savedSongsCount={songs.length} />
          {currentSong && onKeyChange && onModeChange && onTranspose && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/60 px-2.5 py-1 text-xs font-mono font-bold text-foreground hover:border-primary/50 transition-all cursor-pointer shadow-xs"
                  aria-label="Change Key and Transpose"
                >
                  <span className="text-primary font-black text-xs">{currentSong.keyTonic}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {currentSong.keyMode === "major" ? "maj" : "min"}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-3 space-y-3 z-50">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Key Tonic
                    </span>
                    <span className="font-mono text-xs font-black text-primary">
                      {currentSong.keyTonic} {currentSong.keyMode}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 font-mono text-xs">
                    {tonics.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onKeyChange(t)}
                        className={cn(
                          "py-1.5 rounded-lg border text-center font-black transition-colors cursor-pointer",
                          currentSong.keyTonic === t
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted border-border/60 text-foreground",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Scale Mode
                  </span>
                  <div className="flex rounded-lg bg-muted/40 p-0.5">
                    {(["major", "minor"] as const).map((m) => {
                      const active = currentSong.keyMode === m
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => onModeChange(m)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs font-bold uppercase transition-all cursor-pointer",
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

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Transpose
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => onTranspose(-1)}
                      title="Down 1 semitone"
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <span className="text-xs font-mono font-bold text-muted-foreground">1 semitone</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => onTranspose(1)}
                      title="Up 1 semitone"
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Settings / Tools Drawer */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-xl border border-border/80 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer shadow-xs transition-colors"
                aria-label="Studio tools and options"
                title="Tools & Settings"
              >
                <Settings className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 space-y-2 z-50">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Actions
                </span>
                <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Saved
                </div>
              </div>

              <DropdownMenuItem
                onClick={onCreate}
                className="cursor-pointer font-bold text-xs flex items-center gap-2 py-2"
              >
                <Plus className="size-3.5 text-primary" />
                <span>New Song Track</span>
              </DropdownMenuItem>

              {currentSong && (
                <>
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground border-t border-border/60 pt-2">
                    Export Track
                  </div>
                  <DropdownMenuItem
                    onClick={() => downloadMidi(currentSong)}
                    className="cursor-pointer font-bold text-xs flex items-center gap-2 py-1.5 text-amber-400 focus:text-amber-300"
                  >
                    <Download className="size-3.5" />
                    <span>Export MIDI File (.mid)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadLeadSheetText(currentSong)}
                    className="cursor-pointer font-bold text-xs flex items-center gap-2 py-1.5 text-zinc-200"
                  >
                    <FileText className="size-3.5" />
                    <span>Export Lead Sheet (.txt)</span>
                  </DropdownMenuItem>
                </>
              )}

              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground border-t border-border/60 pt-2">
                Studio Modules
              </div>
              {activeModules.map((mod) => (
                <DropdownMenuItem
                  key={mod.id}
                  onClick={() => onSelectModule?.(mod.id)}
                  className={cn(
                    "cursor-pointer text-xs flex items-center justify-between py-1.5",
                    mod.id === activeModule && "font-bold text-primary bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <mod.icon className="size-3.5" />
                    <span>{mod.name}</span>
                  </div>
                  {mod.id === activeModule && <span className="size-1.5 rounded-full bg-primary" />}
                </DropdownMenuItem>
              ))}

              {currentId && songs.length > 1 && (
                <>
                  <div className="my-1 border-t border-border/60" />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive text-xs py-2"
                    onClick={() => currentId && onDelete(currentId)}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    Delete this track
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP-ONLY HEADER (>= md) — POWERFUL FULL STUDIO WORKSPACE               */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between w-full gap-4 min-w-max">
        {/* Left: Studio Module Menu + Project Selector + Title Edit */}
        <div className="flex items-center gap-2 shrink-0">
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
              className="h-8.5 w-auto px-2 sm:px-3 border-border/80 bg-background/60 font-semibold text-xs text-foreground hover:border-border transition-colors rounded-xl gap-1.5 sm:gap-2 cursor-pointer shrink-0"
              aria-label="Select active song"
            >
              <Music className="size-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="font-mono text-[11px] text-muted-foreground">
                <span>Tracks </span>
                <span className="text-foreground font-bold">({songs.length})</span>
              </span>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-[220px]">
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
              className="h-8.5 w-36 sm:w-44 md:w-56 border-border/60 bg-background/50 px-2 sm:px-3 text-xs font-black text-foreground focus-visible:ring-1 focus-visible:ring-primary rounded-xl shrink-0"
              placeholder="Track title..."
              aria-label="Rename song track"
            />
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onCreate}
            className="h-8.5 px-2.5 gap-1.5 border-border/80 bg-background/50 text-xs font-semibold shadow-xs hover:border-primary/50 hover:bg-primary/5 rounded-xl cursor-pointer shrink-0"
            aria-label="Create new song"
            title="Create new song track"
          >
            <Plus className="size-3.5 text-primary" aria-hidden="true" />
            <span>New</span>
          </Button>
        </div>

        {/* Desktop Center: Unified Key, Scale Mode & Transpose Capsule */}
        {currentSong && onKeyChange && onModeChange && onTranspose && (
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/90 p-1 shadow-md shrink-0">
            {/* Key Tonic Dropdown */}
            <Select value={currentSong.keyTonic} onValueChange={(v) => v && onKeyChange(v)}>
              <SelectTrigger
                className="h-7 border-0 bg-zinc-800/90 font-mono text-xs font-black text-amber-400 hover:bg-zinc-700/90 rounded-lg px-2 gap-1 cursor-pointer transition-colors"
                aria-label="Select Key Tonic"
              >
                <span className="text-[10px] text-zinc-400 font-bold uppercase">KEY</span>
                <span className="text-amber-400 font-black">{currentSong.keyTonic}</span>
              </SelectTrigger>
              <SelectContent className="max-h-72 font-mono z-50">
                {tonics.map((t) => (
                  <SelectItem key={t} value={t} className="font-mono text-xs cursor-pointer">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mode Toggle (MAJ / MIN) */}
            <div className="flex h-7 rounded-lg bg-zinc-800/80 p-0.5" role="radiogroup" aria-label="Key Mode">
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
                      "rounded px-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer touch-manipulation",
                      active
                        ? "bg-amber-400 text-zinc-950 font-extrabold shadow-xs"
                        : "text-zinc-400 hover:text-white",
                    )}
                  >
                    {m === "major" ? "MAJ" : "MIN"}
                  </button>
                )
              })}
            </div>

            <div className="h-4 w-px bg-zinc-700/80" />

            {/* Transpose Stepper */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onTranspose(-1)}
                className="size-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer transition-colors"
                title="Transpose down 1 semitone (-1)"
                aria-label="Transpose down 1 semitone"
              >
                <ChevronDown className="size-3.5" />
              </button>
              <span className="font-mono text-[9px] font-bold text-zinc-400 px-1 uppercase tracking-tight">Transpose</span>
              <button
                type="button"
                onClick={() => onTranspose(1)}
                className="size-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer transition-colors"
                title="Transpose up 1 semitone (+1)"
                aria-label="Transpose up 1 semitone"
              >
                <ChevronUp className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Desktop Right: User Profile + AI Import + Export + Piano + Inspector + Autosaved */}
        <div className="flex items-center gap-2">
          <UserProfileButton savedSongsCount={songs.length} />
          {onImportSong && <SongImportModal onImport={onImportSong} />}
          {currentSong && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 gap-1.5 rounded-xl border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 text-xs font-bold shadow-xs cursor-pointer"
                  title="Export song progression to MIDI or Lead Sheet"
                >
                  <Download className="size-3.5" />
                  <span>Export</span>
                  <ChevronDown className="size-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 z-50">
                <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Export Options
                </div>
                <DropdownMenuItem
                  onClick={() => downloadMidi(currentSong)}
                  className="cursor-pointer font-bold text-xs flex items-center justify-between py-2 text-amber-400 focus:text-amber-300"
                >
                  <div className="flex items-center gap-2">
                    <Download className="size-3.5" />
                    <span>MIDI File (.mid)</span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">DAW Ready</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => downloadLeadSheetText(currentSong)}
                  className="cursor-pointer font-bold text-xs flex items-center justify-between py-2 text-zinc-200"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-zinc-400" />
                    <span>Lead Sheet (.txt)</span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">Print / Text</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
              <span>Piano</span>
            </Button>
          )}

          {onToggleInspector && (
            <Button
              variant={showInspector ? "default" : "outline"}
              size="sm"
              onClick={onToggleInspector}
              className={cn(
                "h-8.5 gap-1.5 rounded-xl px-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-all",
                !showInspector && "border-border/80 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title="Toggle Chord Inspector Panel (I)"
              aria-label="Toggle Chord Inspector Panel"
            >
              <PanelRight className="size-3.5" aria-hidden="true" />
              <span>Inspector</span>
            </Button>
          )}

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400 select-none shadow-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>
              {currentSong?.updatedAt
                ? `Saved ${new Date(currentSong.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : "Saved just now"}
            </span>
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
      </div>
    </header>
  )
}
