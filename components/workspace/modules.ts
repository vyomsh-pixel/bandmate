import {
  Music4,
  Guitar,
  Hand,
  ListMusic,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * BandMate module registry.
 *
 * Song Lab is the only active module in Phase 1. The rest are declared here so
 * the workspace shell renders a real, extensible navigation — each future
 * module will flip `available` to true and mount its own view.
 */
export interface ModuleDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  available: boolean
  phase: number
}

export const MODULES: ModuleDef[] = [
  {
    id: "song-lab",
    name: "Song Lab",
    description: "Chords, keys, transposition & playback",
    icon: Music4,
    available: true,
    phase: 1,
  },
  {
    id: "instrument-lab",
    name: "Instrument Lab",
    description: "Guitar, uke, bass, drums & vocals",
    icon: Guitar,
    available: true,
    phase: 2,
  },
  {
    id: "gesture-play",
    name: "Gesture Play",
    description: "Play chords with hand gestures",
    icon: Hand,
    available: false,
    phase: 3,
  },
  {
    id: "setlists",
    name: "Setlists",
    description: "Organize songs for a show",
    icon: ListMusic,
    available: false,
    phase: 4,
  },
  {
    id: "medley-builder",
    name: "AI Medley Builder",
    description: "Smart transitions between songs",
    icon: Sparkles,
    available: false,
    phase: 4,
  },
  {
    id: "band-mode",
    name: "Band Mode",
    description: "Full AI arrangements per instrument",
    icon: Users,
    available: false,
    phase: 5,
  },
]
