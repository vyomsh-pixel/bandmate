import { ChordQuality, ParsedChord } from "./types"

export interface UkuleleVoicing {
  frets: (number | "X")[] // 4 strings: G4, C4, E4, A4
  baseFret: number
  label: string
}

// Shape templates for 4-string Ukulele (strings: G=0, C=1, E=2, A=3)
// rootString: 1 = C (MIDI 60), 2 = E (MIDI 64), 0 = G (MIDI 67)
type UkeShapeTemplate = {
  rootString: 0 | 1 | 2
  rootOffsetFret: number
  offsets: (number | "X")[]
  label: string
}

const UKE_SHAPES: Record<ChordQuality, UkeShapeTemplate[]> = {
  maj: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 0, 3], label: "C-Shape" },
    { rootString: 2, rootOffsetFret: 1, offsets: [2, 0, 1, 0], label: "F-Shape" },
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 2, 2, 0], label: "D-Shape" },
    { rootString: 2, rootOffsetFret: 3, offsets: [0, 2, 3, 2], label: "G-Shape" },
    { rootString: 1, rootOffsetFret: 9, offsets: [2, 1, 0, 0], label: "A-Shape" },
  ],
  min: [
    { rootString: 0, rootOffsetFret: 2, offsets: [2, 0, 0, 0], label: "Am-Shape" },
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 2, 1, 0], label: "Dm-Shape" },
    { rootString: 2, rootOffsetFret: 0, offsets: [0, 4, 3, 2], label: "Em-Shape" },
  ],
  "7": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 0, 1], label: "C7-Shape" },
    { rootString: 2, rootOffsetFret: 3, offsets: [0, 2, 1, 2], label: "G7-Shape" },
    { rootString: 1, rootOffsetFret: 9, offsets: [0, 1, 0, 0], label: "A7-Shape" },
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 0, 2, 0], label: "D7-Shape" },
  ],
  maj7: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 0, 2], label: "Cmaj7-Shape" },
    { rootString: 2, rootOffsetFret: 1, offsets: [2, 4, 1, 0], label: "Fmaj7-Shape" },
    { rootString: 2, rootOffsetFret: 3, offsets: [0, 2, 2, 2], label: "Gmaj7-Shape" },
  ],
  m7: [
    { rootString: 0, rootOffsetFret: 2, offsets: [0, 0, 0, 0], label: "Am7-Shape" },
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 2, 1, 3], label: "Dm7-Shape" },
    { rootString: 2, rootOffsetFret: 0, offsets: [0, 2, 0, 2], label: "Em7-Shape" },
  ],
  dim: [
    { rootString: 1, rootOffsetFret: 0, offsets: [2, 3, 2, 3], label: "Dim-Shape" },
  ],
  dim7: [
    { rootString: 1, rootOffsetFret: 0, offsets: [2, 3, 2, 3], label: "Dim7-Shape" },
  ],
  aug: [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 0, 0, 3], label: "Aug-Shape" },
  ],
  sus2: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 3, 3], label: "Sus2-Shape" },
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 2, 0, 0], label: "Dsus2-Shape" },
  ],
  sus4: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 1, 3], label: "Csus4-Shape" },
    { rootString: 2, rootOffsetFret: 3, offsets: [0, 2, 3, 3], label: "Gsus4-Shape" },
  ],
  "5": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 3, 3], label: "Power 5" },
  ],
  "6": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 0, 0], label: "C6-Shape" },
  ],
  m6: [
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 2, 1, 2], label: "Dm6-Shape" },
  ],
  m7b5: [
    { rootString: 0, rootOffsetFret: 2, offsets: [2, 3, 3, 3], label: "Half-Dim" },
  ],
  "9": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 0, 1], label: "C9-Shape" },
  ],
  maj9: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 0, 2], label: "Cmaj9-Shape" },
  ],
  m9: [
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 2, 0, 0], label: "Dm9-Shape" },
  ],
  add9: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 0, 3], label: "Cadd9-Shape" },
  ],
  "11": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 1, 1], label: "11th-Shape" },
  ],
  maj11: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 1, 2], label: "Maj11-Shape" },
  ],
  m11: [
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 0, 1, 0], label: "m11-Shape" },
  ],
  "13": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 4, 3, 5], label: "13th-Shape" },
  ],
  maj13: [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 4, 3, 2], label: "Maj13-Shape" },
  ],
  m13: [
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 4, 1, 2], label: "m13-Shape" },
  ],
  "7sus4": [
    { rootString: 2, rootOffsetFret: 3, offsets: [0, 2, 1, 3], label: "7sus4-Shape" },
  ],
  "7#9": [
    { rootString: 1, rootOffsetFret: 0, offsets: [3, 2, 0, 1], label: "7#9-Shape" },
  ],
  "7b9": [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 2, 0, 1], label: "7b9-Shape" },
  ],
  "7#5": [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 0, 0, 1], label: "7#5-Shape" },
  ],
  "7b5": [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 0, 0, 3], label: "7b5-Shape" },
  ],
  mM7: [
    { rootString: 1, rootOffsetFret: 2, offsets: [2, 1, 1, 0], label: "m(maj7)" },
  ],
  "7alt": [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 2, 0, 2], label: "7alt-Shape" },
  ],
  "maj7#11": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 2, 0, 2], label: "Maj7#11" },
  ],
  "13b9": [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 4, 0, 1], label: "13b9-Shape" },
  ],
  "7b13": [
    { rootString: 1, rootOffsetFret: 0, offsets: [1, 0, 0, 1], label: "7b13-Shape" },
  ],
  "7#11": [
    { rootString: 1, rootOffsetFret: 0, offsets: [0, 0, 0, 1], label: "7#11-Shape" },
  ],
  "m(add9)": [
    { rootString: 0, rootOffsetFret: 2, offsets: [2, 0, 0, 2], label: "m(add9)" },
  ],
}

// Open pitch classes: G=7, C=0, E=4, A=9
const UKE_OPEN_PCS = [7, 0, 4, 9]

export function generateUkuleleVoicings(chord: ParsedChord): UkuleleVoicing[] {
  if (!chord.valid) return []

  const templates = UKE_SHAPES[chord.quality] || UKE_SHAPES["maj"]
  const voicings: UkuleleVoicing[] = []

  for (const t of templates) {
    const stringOpenPc = UKE_OPEN_PCS[t.rootString]
    const naturalRootFret = (chord.rootPc - stringOpenPc + 12) % 12
    const shift = (naturalRootFret - t.rootOffsetFret + 12) % 12

    const frets = t.offsets.map((offset) => {
      if (offset === "X") return "X"
      return offset + shift
    })

    if (frets.some((f) => typeof f === "number" && f < 0)) continue

    const numericFrets = frets.filter((f): f is number => typeof f === "number")
    const activeFrets = numericFrets.filter((f) => f > 0)
    const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 0
    const maxFret = activeFrets.length > 0 ? Math.max(...activeFrets) : 0

    if (maxFret <= 14 && (activeFrets.length === 0 || maxFret - minFret <= 4)) {
      voicings.push({
        frets,
        baseFret: (!numericFrets.includes(0) && minFret > 1) ? minFret : 0,
        label: t.label,
      })
    }
  }

  return voicings.length > 0
    ? voicings
    : [{ frets: [0, 0, 0, 0], baseFret: 0, label: "Open Ukulele" }]
}
