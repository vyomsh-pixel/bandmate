"use client"

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
import { Plus, MoreVertical, Trash2, Music, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SongLibraryBarProps {
  songs: Song[]
  currentId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export function SongLibraryBar({ songs, currentId, onSelect, onCreate, onDelete }: SongLibraryBarProps) {
  const currentSong = songs.find((s) => s.id === currentId) ?? songs[0]

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/80 bg-card/70 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Music className="size-4 text-primary" aria-hidden="true" />
          <span className="hidden font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
            Project
          </span>
        </div>

        <Select value={currentId ?? ""} onValueChange={(v) => v && onSelect(v)}>
          <SelectTrigger className="h-9 w-52 sm:w-64 border-border/80 bg-background/60 font-medium hover:border-border transition-colors" aria-label="Select active song">
            <span className="truncate text-left text-sm font-semibold tracking-tight text-foreground">
              {currentSong?.title || "Untitled Song"}
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

        <Button
          variant="outline"
          size="sm"
          onClick={onCreate}
          className="h-9 gap-1.5 border-border/80 bg-background/60 text-xs font-semibold shadow-xs hover:border-primary/50 hover:bg-primary/5"
          aria-label="Create new song"
        >
          <Plus className="size-3.5 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">New Song</span>
        </Button>

        {currentId && songs.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Song options menu"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => currentId && onDelete(currentId)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Delete current song
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 select-none shadow-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">Autosaved Locally</span>
        </div>
      </div>
    </header>
  )
}
