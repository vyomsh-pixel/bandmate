"use client"

import { useState, useMemo } from "react"
import {
  Sparkles,
  Download,
  Copy,
  FileCode,
  FileText,
  Music,
  Check,
  Printer,
  ChevronDown,
  Layers,
  ArrowRight,
} from "lucide-react"
import type { Song } from "@/lib/music/types"
import {
  generateLeadSheetText,
  downloadLeadSheetText,
  generateChordProText,
  downloadChordPro,
  downloadProjectJson,
} from "@/lib/export/lead-sheet"
import { downloadMidi } from "@/lib/export/midi-export"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ExportStudioViewProps {
  songs: Song[]
  currentSong: Song | null
  onSelectSong: (songId: string) => void
}

export function ExportStudioView({
  songs,
  currentSong,
  onSelectSong,
}: ExportStudioViewProps) {
  const [selectedSongId, setSelectedSongId] = useState<string>(
    currentSong?.id ?? songs[0]?.id ?? "",
  )
  const [previewFormat, setPreviewFormat] = useState<"leadsheet" | "chordpro" | "json">("leadsheet")
  const [copied, setCopied] = useState(false)

  const activeSong = useMemo(() => {
    return songs.find((s) => s.id === selectedSongId) ?? currentSong ?? songs[0] ?? null
  }, [songs, selectedSongId, currentSong])

  const previewContent = useMemo(() => {
    if (!activeSong) return ""
    if (previewFormat === "leadsheet") return generateLeadSheetText(activeSong)
    if (previewFormat === "chordpro") return generateChordProText(activeSong)
    return JSON.stringify(activeSong, null, 2)
  }, [activeSong, previewFormat])

  const handleCopy = () => {
    if (!previewContent) return
    navigator.clipboard.writeText(previewContent)
    setCopied(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    if (!activeSong) return
    const text = generateLeadSheetText(activeSong)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${activeSong.title} — Lead Sheet</title>
            <style>
              body { font-family: monospace; white-space: pre-wrap; padding: 2rem; font-size: 14px; }
            </style>
          </head>
          <body>${text}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  if (!activeSong) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <p>No songs available to export. Create a song in Song Lab first.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      {/* Left Pane: Format Cards & Exporters */}
      <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border/80 bg-zinc-950/70 p-3 sm:p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-amber-400" />
          <h2 className="font-mono text-sm font-black uppercase tracking-wider text-white">
            Export Studio
          </h2>
        </div>

        {/* Track Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            Target Track
          </label>
          <select
            value={selectedSongId}
            onChange={(e) => {
              setSelectedSongId(e.target.value)
              onSelectSong(e.target.value)
            }}
            className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 font-mono text-xs font-bold text-white cursor-pointer outline-hidden focus:border-amber-400"
          >
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title || "Untitled"} ({s.keyTonic} {s.keyMode})
              </option>
            ))}
          </select>
        </div>

        {/* Formats Grid */}
        <div className="flex flex-col gap-2.5">
          {/* Format 1: Standard MIDI */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="size-4 text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-mono text-xs font-bold text-white">Standard MIDI (.mid)</h4>
                  <p className="text-[10px] text-zinc-400">4-Part SATB polyphony &amp; voicing offsets</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => downloadMidi(activeSong)}
                className="h-7 px-2.5 text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 cursor-pointer shrink-0"
              >
                <Download className="size-3 mr-1" />
                <span>Download</span>
              </Button>
            </div>
          </div>

          {/* Format 2: Printable Lead Sheet */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-mono text-xs font-bold text-white">Printable Lead Sheet</h4>
                  <p className="text-[10px] text-zinc-400">ASCII chord grid with Capo recommendations</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="size-7 p-0 border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                  title="Print Lead Sheet"
                >
                  <Printer className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadLeadSheetText(activeSong)}
                  className="h-7 px-2.5 text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer"
                >
                  <Download className="size-3 mr-1" />
                  <span>.txt</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Format 3: ChordPro */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="size-4 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="font-mono text-xs font-bold text-white">ChordPro (.cho)</h4>
                  <p className="text-[10px] text-zinc-400">Standard format for stage prompters</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => downloadChordPro(activeSong)}
                className="h-7 px-2.5 text-xs font-bold bg-cyan-400 text-black hover:bg-cyan-300 cursor-pointer shrink-0"
              >
                <Download className="size-3 mr-1" />
                <span>.cho</span>
              </Button>
            </div>
          </div>

          {/* Format 4: Lossless JSON Backup */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-violet-400 shrink-0" />
                <div>
                  <h4 className="font-mono text-xs font-bold text-white">Project JSON</h4>
                  <p className="text-[10px] text-zinc-400">Complete lossless BandMate backup</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => downloadProjectJson(activeSong)}
                className="h-7 px-2.5 text-xs font-bold bg-violet-400 text-black hover:bg-violet-300 cursor-pointer shrink-0"
              >
                <Download className="size-3 mr-1" />
                <span>.json</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Live Document Preview & Quick Copy */}
      <div className="flex-1 flex flex-col bg-card/40 min-w-0 overflow-hidden">
        {/* Preview Header & Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-2.5 bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Document Preview:
            </span>
            <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
              <button
                type="button"
                onClick={() => setPreviewFormat("leadsheet")}
                className={cn(
                  "px-2.5 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer transition-all",
                  previewFormat === "leadsheet"
                    ? "bg-amber-400 text-black shadow-xs"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                Lead Sheet
              </button>
              <button
                type="button"
                onClick={() => setPreviewFormat("chordpro")}
                className={cn(
                  "px-2.5 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer transition-all",
                  previewFormat === "chordpro"
                    ? "bg-amber-400 text-black shadow-xs"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                ChordPro
              </button>
              <button
                type="button"
                onClick={() => setPreviewFormat("json")}
                className={cn(
                  "px-2.5 py-0.5 font-mono text-[10px] font-bold rounded cursor-pointer transition-all",
                  previewFormat === "json"
                    ? "bg-amber-400 text-black shadow-xs"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                JSON
              </button>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-7 px-2 font-mono text-xs font-bold border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copied" : "Copy Text"}</span>
          </Button>
        </div>

        {/* Text Viewport */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs bg-zinc-950/90 text-zinc-300 leading-relaxed whitespace-pre select-text">
          {previewContent}
        </div>
      </div>
    </div>
  )
}
