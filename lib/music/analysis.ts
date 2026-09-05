import { parseChord } from "./chord-parser"
import { noteNameToPc } from "./notes"
import { makeKey, scalePitchClasses } from "./scales"
import type { Key, ParsedChord } from "./types"

/**
 * Harmonic analysis utilities (Circle of Fifths, Roman Numerals, Key Detection).
 */

export const CIRCLE_OF_FIFTHS_MAJOR = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]
export const CIRCLE_OF_FIFTHS_MINOR = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm"]

/**
 * Determines the Roman Numeral for a given chord within a key.
 */
export function getRomanNumeral(chordSymbol: string, key: Key): string | null {
  const parsed = parseChord(chordSymbol)
  if (!parsed.valid) return null

  const tonicPc = noteNameToPc(key.tonic) ?? 0
  const semitones = ((parsed.rootPc - tonicPc) % 12 + 12) % 12
  const scalePcs = scalePitchClasses(key)
  const degreeIndex = scalePcs.indexOf(parsed.rootPc)

  const numeralsMajor = ["I", "II", "III", "IV", "V", "VI", "VII"]
  const numeralsMinor = ["i", "ii", "iii", "iv", "v", "vi", "vii"]

  let baseRoman: string
  const isMinorQuality =
    parsed.quality === "min" ||
    parsed.quality.startsWith("min") ||
    (parsed.quality.startsWith("m") && !parsed.quality.startsWith("maj")) ||
    parsed.quality === "dim" ||
    parsed.quality === "dim7" ||
    parsed.quality === "m7b5"

  const isDomQuality =
    parsed.quality === "7" ||
    parsed.quality === "9" ||
    parsed.quality === "13" ||
    parsed.quality === "7alt" ||
    parsed.quality === "7b9" ||
    parsed.quality === "7#9" ||
    parsed.quality === "7#5" ||
    parsed.quality === "7b5" ||
    parsed.quality === "7sus4"

  // Check for Secondary Dominants in Major/Minor keys
  if (isDomQuality) {
    if (key.mode === "major") {
      if (semitones === 2) return "V7/V"
      if (semitones === 4) return "V7/vi"
      if (semitones === 9) return "V7/ii"
      if (semitones === 11) return "V7/iii"
      if (semitones === 0) return "V7/IV"
      if (semitones === 1) return "subV7"
      if (semitones === 8) return "subV7/V"
    } else {
      if (semitones === 7) return "V7"
      if (semitones === 4) return "V7/iv"
      if (semitones === 11) return "V7/V"
    }
  }

  if (degreeIndex !== -1) {
    baseRoman = isMinorQuality ? numeralsMinor[degreeIndex] : numeralsMajor[degreeIndex]
  } else {
    // Non-diatonic / borrowed chromatic intervals
    const chromaticMajorMap: Record<number, { maj: string; min: string }> = {
      1: { maj: "bII", min: "bii" },
      3: { maj: "bIII", min: "biii" },
      6: { maj: "#IV", min: "#iv" },
      8: { maj: "bVI", min: "bvi" },
      10: { maj: "bVII", min: "bvii" },
    }
    const match = chromaticMajorMap[semitones]
    if (!match) return null
    baseRoman = isMinorQuality ? match.min : match.maj
  }

  // Extensions and quality annotations
  if (parsed.quality === "dim7") {
    return baseRoman + "°7"
  } else if (parsed.quality === "m7b5") {
    return baseRoman + "ø7"
  } else if (parsed.quality === "dim") {
    return baseRoman + "°"
  } else if (parsed.quality === "aug") {
    return baseRoman + "+"
  } else if (parsed.quality === "maj7" || parsed.quality === "maj9" || parsed.quality === "maj11" || parsed.quality === "maj13" || parsed.quality === "maj7#11") {
    return baseRoman + "maj7"
  } else if (parsed.quality === "7" || parsed.quality === "9" || parsed.quality === "13" || parsed.quality === "m7" || parsed.quality === "m9" || parsed.quality === "m11" || parsed.quality === "m13" || parsed.quality === "7alt") {
    return baseRoman + "7"
  } else if (parsed.quality === "sus4") {
    return baseRoman + "sus4"
  } else if (parsed.quality === "7sus4") {
    return baseRoman + "7sus4"
  }

  return baseRoman
}

export type HarmonicRole = "tonic" | "subdominant" | "dominant" | "chromatic"

export interface HarmonicFunctionInfo {
  role: HarmonicRole
  label: string
  roman: string | null
  badgeColor: string
}

/**
 * Categorizes a chord into its functional harmonic family:
 * - Tonic (Home / Resolution — Amber)
 * - Subdominant (Movement / Departure — Emerald)
 * - Dominant (Tension / Pull — Rose)
 * - Chromatic / Borrowed (Expressive Color — Purple)
 */
export function getHarmonicFunction(chordSymbol: string, key: Key): HarmonicFunctionInfo {
  const roman = getRomanNumeral(chordSymbol, key)
  const parsed = parseChord(chordSymbol)
  if (!parsed.valid) {
    return {
      role: "chromatic",
      label: "Unknown",
      roman: null,
      badgeColor: "text-muted-foreground bg-muted/40 border-border/80",
    }
  }

  const scalePcs = scalePitchClasses(key)
  const degreeIndex = scalePcs.indexOf(parsed.rootPc)

  if (degreeIndex === -1) {
    return {
      role: "chromatic",
      label: "Borrowed",
      roman,
      badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    }
  }

  if (key.mode === "major") {
    if (degreeIndex === 0 || degreeIndex === 5 || degreeIndex === 2) {
      return {
        role: "tonic",
        label: degreeIndex === 0 ? "Tonic" : "Tonic Rel",
        roman,
        badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      }
    }
    if (degreeIndex === 3 || degreeIndex === 1) {
      return {
        role: "subdominant",
        label: "Subdominant",
        roman,
        badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      }
    }
    return {
      role: "dominant",
      label: "Dominant",
      roman,
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    }
  } else {
    // Minor key
    if (degreeIndex === 0 || degreeIndex === 2 || degreeIndex === 5) {
      return {
        role: "tonic",
        label: degreeIndex === 0 ? "Tonic" : "Tonic Rel",
        roman,
        badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      }
    }
    if (degreeIndex === 3 || degreeIndex === 1) {
      return {
        role: "subdominant",
        label: "Subdominant",
        roman,
        badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      }
    }
    return {
      role: "dominant",
      label: "Dominant",
      roman,
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    }
  }
}

/**
 * Predicts the most likely key based on a sequence of chords using diatonic scoring.
 */
export function detectKey(chords: string[]): Key | null {
  if (chords.length === 0) return null

  const parsedList = chords.map(parseChord).filter((c) => c.valid)
  if (parsedList.length === 0) return null

  const candidates: { tonic: string; mode: "major" | "minor" }[] = []
  for (const t of CIRCLE_OF_FIFTHS_MAJOR) candidates.push({ tonic: t, mode: "major" })
  for (const t of CIRCLE_OF_FIFTHS_MINOR) candidates.push({ tonic: t.replace("m", ""), mode: "minor" })

  let bestKey: Key | null = null
  let bestScore = -Infinity

  for (const cand of candidates) {
    const keyObj = makeKey(cand.tonic, cand.mode)
    const scalePcs = new Set(scalePitchClasses(keyObj))
    const tonicPc = noteNameToPc(cand.tonic) ?? 0

    let score = 0
    parsedList.forEach((c, idx) => {
      // Chord tone diatonic fit
      const chordPcs = c.intervals.map((i) => (c.rootPc + i) % 12)
      const diatonicToneCount = chordPcs.filter((pc) => scalePcs.has(pc)).length
      score += diatonicToneCount

      // Root in scale bonus
      if (scalePcs.has(c.rootPc)) score += 2

      // First chord is tonic bonus
      if (idx === 0 && c.rootPc === tonicPc) {
        const isMin =
          c.quality === "min" ||
          c.quality.startsWith("min") ||
          (c.quality.startsWith("m") && !c.quality.startsWith("maj"))
        if (isMin === (cand.mode === "minor")) score += 4
      }

      // Last chord cadence bonus
      if (idx === parsedList.length - 1 && c.rootPc === tonicPc) {
        score += 3
      }
    })

    if (score > bestScore) {
      bestScore = score
      bestKey = keyObj
    }
  }

  return bestKey
}
