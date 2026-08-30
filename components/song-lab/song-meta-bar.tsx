"use client"

/**
 * BandMate — Song meta bar.
 *
 * Edits the song title, key (tonic + mode) and provides chromatic transpose
 * controls. Changing the key transposes the whole progression to the new key;
 * the +/- buttons shift everything by a semitone.
 */

import { ChevronDown, ChevronUp, SlidersHorizontal, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { MAJOR_TONICS, MINOR_TONICS } from "@/lib/music/scales"
import { Badge } from "@/components/ui/badge"

interface SongMetaBarProps {
  title: string
  keyTonic: string
  keyMode: "major" | "minor"
  onTitleChange: (title: string) => void
  onKeyChange: (tonic: string) => void
  onModeChange: (mode: "major" | "minor") => void
  onTranspose: (semitones: number) => void
}

export function SongMetaBar({
  title,
  keyTonic,
  keyMode,
  onTitleChange,
  onKeyChange,
  onModeChange,
  onTranspose,
}: SongMetaBarProps) {
  const tonics = keyMode === "major" ? MAJOR_TONICS : MINOR_TONICS

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Title Input */}
      <div className="flex min-w-[240px] flex-1 items-center gap-3">
        <div className="flex-1">
          <label htmlFor="song-title" className="sr-only">
            Song Title
          </label>
          <Input
            id="song-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="h-10 border-border/80 bg-background/50 px-3 text-lg font-bold tracking-tight placeholder:text-muted-foreground/50 focus-visible:border-primary/80 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-lg"
            placeholder="Name your track..."
          />
        </div>
      </div>

      {/* Musical Controls Group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Key Signature */}
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/50 p-1.5 shadow-xs">
          <span className="px-2 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Key
          </span>

          <Select value={keyTonic} onValueChange={(v) => v && onKeyChange(v)}>
            <SelectTrigger className="h-8 w-16 border-0 bg-muted/60 font-mono text-xs font-black hover:bg-muted rounded-xl" aria-label="Key tonic">
              <span>{keyTonic}</span>
            </SelectTrigger>
            <SelectContent className="max-h-72 font-mono">
              {tonics.map((t) => (
                <SelectItem key={t} value={t} className="font-mono text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mode Toggle */}
          <div className="flex h-8 overflow-hidden rounded-xl bg-muted/40 p-0.5" role="radiogroup" aria-label="Key mode">
            {(["major", "minor"] as const).map((m) => {
              const active = keyMode === m
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onModeChange(m)}
                  className={cn(
                    "rounded-lg px-2.5 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer",
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

        {/* Chromatic Transpose */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/50 p-1.5 shadow-xs">
          <span className="px-2 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Transpose
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl hover:bg-muted cursor-pointer"
              onClick={() => onTranspose(-1)}
              aria-label="Transpose down 1 semitone"
              title="Transpose down 1 semitone"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl hover:bg-muted cursor-pointer"
              onClick={() => onTranspose(1)}
              aria-label="Transpose up 1 semitone"
              title="Transpose up 1 semitone"
            >
              <ChevronUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
