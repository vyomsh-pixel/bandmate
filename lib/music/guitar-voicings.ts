import { ParsedChord } from "./types"
import { noteNameToPc } from "./notes"

export interface GuitarVoicing {
  frets: (number | "X")[] // 6 strings: E2, A2, D3, G3, B3, E4
  baseFret: number
  label: string
}

// Basic shape templates (relative to root pitch class)
// We define the root string (0 = low E, 1 = A, 2 = D) and the fret offsets from the root fret.
type ShapeTemplate = {
  rootString: 0 | 1 | 2
  offsets: (number | "X")[]
  label: string
}

const SHAPES: Record<string, ShapeTemplate[]> = {
  maj: [
    { rootString: 0, offsets: [0, 2, 2, 1, 0, 0], label: "E-Shape (Barre)" },
    { rootString: 1, offsets: ["X", 0, 2, 2, 2, 0], label: "A-Shape (Barre)" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 3, 2], label: "D-Shape" },
    { rootString: 1, offsets: ["X", 3, 2, 0, 1, 0], label: "C-Shape" },
    { rootString: 0, offsets: [3, 2, 0, 0, 0, 3], label: "G-Shape" },
  ],
  min: [
    { rootString: 0, offsets: [0, 2, 2, 0, 0, 0], label: "Em-Shape (Barre)" },
    { rootString: 1, offsets: ["X", 0, 2, 2, 1, 0], label: "Am-Shape (Barre)" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 3, 1], label: "Dm-Shape" },
  ],
  "7": [
    { rootString: 0, offsets: [0, 2, 0, 1, 0, 0], label: "E7-Shape (Barre)" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 2, 0], label: "A7-Shape (Barre)" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 1, 2], label: "D7-Shape" },
  ],
  m7: [
    { rootString: 0, offsets: [0, 2, 0, 0, 0, 0], label: "Em7-Shape (Barre)" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 1, 0], label: "Am7-Shape (Barre)" },
  ],
  maj7: [
    { rootString: 0, offsets: [0, "X", 1, 1, 0, "X"], label: "Emaj7-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 2, 0], label: "Amaj7-Shape" },
  ]
}

const ROOT_PITCHES = [40, 45, 50] // low E, A, D

export function generateGuitarVoicings(chord: ParsedChord): GuitarVoicing[] {
  if (!chord.valid) return []

  const templates = SHAPES[chord.quality] || SHAPES["maj"]
  const voicings: GuitarVoicing[] = []

  for (const t of templates) {
    const rootOpenMidi = ROOT_PITCHES[t.rootString]
    const rootOpenPc = rootOpenMidi % 12
    let rootFret = (chord.rootPc - rootOpenPc + 12) % 12

    // For C-shape and G-shape open templates, the reference root is at fret 3
    let shift = rootFret
    if (t.label.includes("C-Shape") || t.label.includes("G-Shape")) {
      shift = rootFret >= 3 ? rootFret - 3 : rootFret + 9
    }

    const frets = t.offsets.map((offset) => {
      if (offset === "X") return "X"
      if (t.label.includes("C-Shape") || t.label.includes("G-Shape")) {
        return offset + shift
      }
      return offset + rootFret
    })

    // Validate that frets are within playable neck range and reach
    const numericFrets = frets.filter((f): f is number => typeof f === "number")
    const activeFrets = numericFrets.filter((f) => f > 0)
    const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 0
    const maxFret = activeFrets.length > 0 ? Math.max(...activeFrets) : 0

    // Only keep reasonable finger stretches (<= 4 frets) and within neck range (<= 15 frets)
    if (maxFret <= 15 && (activeFrets.length === 0 || maxFret - minFret <= 4)) {
      voicings.push({
        frets,
        baseFret: minFret > 3 ? minFret : 0,
        label: t.label,
      })
    }
  }

  return voicings.length > 0 ? voicings : [
    { frets: ["X", "X", "X", "X", "X", "X"], baseFret: 0, label: "No Shape Found" }
  ]
}
