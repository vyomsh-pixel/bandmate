import { ChordQuality, ParsedChord } from "./types"

export interface GuitarVoicing {
  frets: (number | "X")[] // 6 strings: E2, A2, D3, G3, B3, E4
  baseFret: number
  label: string
}

// Shape templates (relative to root pitch class)
// rootString: 0 = low E (MIDI 40), 1 = A (MIDI 45), 2 = D (MIDI 50)
type ShapeTemplate = {
  rootString: 0 | 1 | 2
  offsets: (number | "X")[]
  label: string
}

const SHAPES: Record<ChordQuality, ShapeTemplate[]> = {
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
  dim: [
    { rootString: 1, offsets: ["X", 0, 1, 2, 1, "X"], label: "Adim-Shape" },
    { rootString: 0, offsets: [0, 1, 2, 0, "X", "X"], label: "Edim-Shape" },
    { rootString: 2, offsets: ["X", "X", 0, 1, 3, 1], label: "Ddim-Shape" },
  ],
  aug: [
    { rootString: 0, offsets: [0, "X", 2, 1, 1, 0], label: "Eaug-Shape" },
    { rootString: 1, offsets: ["X", 0, 3, 2, 2, 1], label: "Aaug-Shape" },
  ],
  sus2: [
    { rootString: 1, offsets: ["X", 0, 2, 2, 0, 0], label: "Asus2-Shape" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 3, 0], label: "Dsus2-Shape" },
  ],
  sus4: [
    { rootString: 0, offsets: [0, 2, 2, 2, 0, 0], label: "Esus4-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 2, 3, 0], label: "Asus4-Shape" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 3, 3], label: "Dsus4-Shape" },
  ],
  "5": [
    { rootString: 0, offsets: [0, 2, 2, "X", "X", "X"], label: "E5 Power Chord" },
    { rootString: 1, offsets: ["X", 0, 2, 2, "X", "X"], label: "A5 Power Chord" },
  ],
  "6": [
    { rootString: 0, offsets: [0, 2, 2, 1, 2, 0], label: "E6-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 2, 2, 2], label: "A6-Shape" },
  ],
  m6: [
    { rootString: 0, offsets: [0, 2, 2, 0, 2, 0], label: "Em6-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 2, 1, 2], label: "Am6-Shape" },
  ],
  "7": [
    { rootString: 0, offsets: [0, 2, 0, 1, 0, 0], label: "E7-Shape (Barre)" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 2, 0], label: "A7-Shape (Barre)" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 1, 2], label: "D7-Shape" },
  ],
  maj7: [
    { rootString: 0, offsets: [0, "X", 1, 1, 0, "X"], label: "Emaj7-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 2, 0], label: "Amaj7-Shape" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 2, 2], label: "Dmaj7-Shape" },
  ],
  m7: [
    { rootString: 0, offsets: [0, 2, 0, 0, 0, 0], label: "Em7-Shape (Barre)" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 1, 0], label: "Am7-Shape (Barre)" },
    { rootString: 2, offsets: ["X", "X", 0, 2, 1, 1], label: "Dm7-Shape" },
  ],
  m7b5: [
    { rootString: 0, offsets: [0, 1, 0, 0, "X", "X"], label: "Em7b5-Shape" },
    { rootString: 1, offsets: ["X", 0, 1, 0, 1, "X"], label: "Am7b5-Shape" },
    { rootString: 2, offsets: ["X", "X", 0, 1, 1, 1], label: "Dm7b5-Shape" },
  ],
  dim7: [
    { rootString: 2, offsets: ["X", "X", 0, 1, 0, 1], label: "Ddim7-Shape" },
    { rootString: 0, offsets: [0, "X", -1, 0, -1, "X"], label: "Edim7-Shape" },
    { rootString: 1, offsets: ["X", 0, 1, -1, 1, "X"], label: "Adim7-Shape" },
  ],
  "9": [
    { rootString: 0, offsets: [0, 2, 0, 1, 0, 2], label: "E9-Shape" },
    { rootString: 1, offsets: ["X", 0, -1, 0, 0, 0], label: "A9-Shape (Jazz)" },
  ],
  maj9: [
    { rootString: 0, offsets: [0, 2, 1, 1, 0, 2], label: "Emaj9-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 0, 0], label: "Amaj9-Shape" },
  ],
  m9: [
    { rootString: 0, offsets: [0, 2, 0, 0, 0, 2], label: "Em9-Shape" },
    { rootString: 1, offsets: ["X", 0, -2, 0, 0, 0], label: "Am9-Shape (Jazz)" },
  ],
  add9: [
    { rootString: 0, offsets: [0, 2, 2, 1, 0, 2], label: "Eadd9-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 0, 0], label: "Aadd9-Shape" },
  ],
  "11": [
    { rootString: 0, offsets: [0, 0, 0, 1, 0, 2], label: "E11-Shape" },
    { rootString: 1, offsets: ["X", 0, 0, 0, 0, 0], label: "A11-Shape" },
  ],
  maj11: [
    { rootString: 0, offsets: [0, 0, 1, 1, 0, 0], label: "Emaj11-Shape" },
    { rootString: 1, offsets: ["X", 0, 0, 1, 0, 0], label: "Amaj11-Shape" },
  ],
  m11: [
    { rootString: 0, offsets: [0, 0, 0, 0, 0, 0], label: "Em11-Shape" },
    { rootString: 1, offsets: ["X", 0, 0, 0, 1, 0], label: "Am11-Shape" },
  ],
  "13": [
    { rootString: 0, offsets: [0, "X", 0, 1, 2, 0], label: "E13-Shape (Jazz)" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 2, 2], label: "A13-Shape" },
  ],
  maj13: [
    { rootString: 0, offsets: [0, "X", 1, 1, 2, 0], label: "Emaj13-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 2, 2], label: "Amaj13-Shape" },
  ],
  m13: [
    { rootString: 0, offsets: [0, 2, 0, 0, 2, 0], label: "Em13-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 1, 2], label: "Am13-Shape" },
  ],
  "7sus4": [
    { rootString: 0, offsets: [0, 2, 0, 2, 0, 0], label: "E7sus4-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 3, 0], label: "A7sus4-Shape" },
  ],
  "7#9": [
    { rootString: 0, offsets: [0, 2, 0, 1, 3, 3], label: "E7#9-Shape" },
    { rootString: 1, offsets: ["X", 0, -1, 0, 1, "X"], label: "A7#9-Shape (Hendrix)" },
  ],
  "7b9": [
    { rootString: 0, offsets: [0, 2, 0, 1, 0, 1], label: "E7b9-Shape" },
    { rootString: 1, offsets: ["X", 0, -1, 0, -1, "X"], label: "A7b9-Shape" },
  ],
  "7#5": [
    { rootString: 0, offsets: [0, "X", 0, 1, 1, "X"], label: "E7#5-Shape" },
    { rootString: 1, offsets: ["X", 0, 3, 0, 2, 1], label: "A7#5-Shape" },
  ],
  "7b5": [
    { rootString: 0, offsets: [0, 1, 0, 1, "X", "X"], label: "E7b5-Shape" },
    { rootString: 1, offsets: ["X", 0, 1, 0, 2, "X"], label: "A7b5-Shape" },
  ],
  mM7: [
    { rootString: 0, offsets: [0, 2, 1, 0, 0, 0], label: "Em(maj7)-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 1, 0], label: "Am(maj7)-Shape" },
  ],
  "7alt": [
    { rootString: 0, offsets: [0, "X", 0, 1, 1, 1], label: "E7alt-Shape" },
    { rootString: 1, offsets: ["X", 0, 1, 0, 1, 1], label: "A7alt-Shape" },
  ],
  "maj7#11": [
    { rootString: 0, offsets: [0, 1, 1, 1, 0, 0], label: "Emaj7#11-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 1, 2, -1], label: "Amaj7#11-Shape" },
  ],
  "13b9": [
    { rootString: 0, offsets: [0, "X", 0, 1, 2, 1], label: "E13b9-Shape" },
    { rootString: 1, offsets: ["X", 0, -1, 0, -1, 2], label: "A13b9-Shape" },
  ],
  "7b13": [
    { rootString: 0, offsets: [0, "X", 0, 1, 1, 0], label: "E7b13-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 0, 2, 1], label: "A7b13-Shape" },
  ],
  "7#11": [
    { rootString: 0, offsets: [0, 1, 0, 1, 0, 0], label: "E7#11-Shape" },
    { rootString: 1, offsets: ["X", 0, 1, 0, 2, 0], label: "A7#11-Shape" },
  ],
  "m(add9)": [
    { rootString: 0, offsets: [0, 2, 2, 0, 0, 2], label: "Em(add9)-Shape" },
    { rootString: 1, offsets: ["X", 0, 2, 2, 1, 2], label: "Am(add9)-Shape" },
  ],
}

const ROOT_PITCHES = [40, 45, 50] // low E, A, D

export function generateGuitarVoicings(chord: ParsedChord): GuitarVoicing[] {
  if (!chord.valid) return []

  const templates = SHAPES[chord.quality] || SHAPES["maj"]
  const voicings: GuitarVoicing[] = []

  for (const t of templates) {
    const rootOpenMidi = ROOT_PITCHES[t.rootString]
    const rootOpenPc = rootOpenMidi % 12
    const rootFret = (chord.rootPc - rootOpenPc + 12) % 12

    // For C-shape and G-shape open templates, the reference root is at fret 3
    let shift = rootFret
    if (t.label.includes("C-Shape") || t.label.includes("G-Shape")) {
      shift = rootFret >= 3 ? rootFret - 3 : rootFret + 9
    }

    let frets = t.offsets.map((offset) => {
      if (offset === "X") return "X"
      return offset + shift
    })

    // Shift up an octave if any offset produced a negative fret number
    if (frets.some((f) => typeof f === "number" && f < 0)) {
      frets = frets.map((f) => (typeof f === "number" ? f + 12 : "X"))
    }

    // Validate that frets are within playable neck range and reach
    const numericFrets = frets.filter((f): f is number => typeof f === "number")
    if (numericFrets.some((f) => f < 0)) continue

    const activeFrets = numericFrets.filter((f) => f > 0)
    const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 0
    const maxFret = activeFrets.length > 0 ? Math.max(...activeFrets) : 0

    // Only keep reasonable finger stretches (<= 4 frets) and within neck range (<= 15 frets)
    if (maxFret <= 15 && (activeFrets.length === 0 || maxFret - minFret <= 4)) {
      voicings.push({
        frets,
        baseFret: (!numericFrets.includes(0) && minFret > 1) ? minFret : (minFret > 3 ? minFret : 0),
        label: t.label,
      })
    }
  }

  return voicings.length > 0 ? voicings : [
    { frets: ["X", "X", "X", "X", "X", "X"], baseFret: 0, label: "No Shape Found" }
  ]
}
