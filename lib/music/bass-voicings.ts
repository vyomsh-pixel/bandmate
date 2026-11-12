import { ParsedChord } from "./types"

export interface BassVoicing {
  frets: (number | "X")[] // 4 strings: E1 (0), A1 (1), D2 (2), G2 (3)
  baseFret: number
  label: string
}

// 4-string bass: E=28, A=33, D=38, G=43
const BASS_OPEN_PCS = [4, 9, 2, 7] // E=4, A=9, D=2, G=7

export function generateBassVoicings(chord: ParsedChord): BassVoicing[] {
  if (!chord.valid) return []

  const voicings: BassVoicing[] = []
  const rootPc = chord.rootPc

  // Find root note on low E string (index 0)
  const eRootFret = (rootPc - BASS_OPEN_PCS[0] + 12) % 12
  // Root note only
  voicings.push({
    frets: [eRootFret, "X", "X", "X"],
    baseFret: eRootFret > 3 ? eRootFret : 0,
    label: "Root (E-string)",
  })

  // Root + 5th (E-string root)
  if (eRootFret <= 13) {
    voicings.push({
      frets: [eRootFret, eRootFret + 2, "X", "X"],
      baseFret: eRootFret > 3 ? eRootFret : 0,
      label: "Root + 5th",
    })
  }

  // Root + 5th + Octave (classic funk/rock bass box)
  if (eRootFret <= 13) {
    voicings.push({
      frets: [eRootFret, eRootFret + 2, eRootFret + 2, "X"],
      baseFret: eRootFret > 3 ? eRootFret : 0,
      label: "Root-5th-Octave Box",
    })
  }

  // Find root note on A string (index 1)
  const aRootFret = (rootPc - BASS_OPEN_PCS[1] + 12) % 12
  voicings.push({
    frets: ["X", aRootFret, "X", "X"],
    baseFret: aRootFret > 3 ? aRootFret : 0,
    label: "Root (A-string)",
  })

  if (aRootFret <= 13) {
    voicings.push({
      frets: ["X", aRootFret, aRootFret + 2, "X"],
      baseFret: aRootFret > 3 ? aRootFret : 0,
      label: "Root + 5th (A-string)",
    })
  }

  return voicings
}
