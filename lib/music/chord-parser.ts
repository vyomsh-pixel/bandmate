/**
 * BandMate — Chord parser.
 *
 * Turns a written chord symbol (e.g. "F#m7", "Cmaj7", "G/B", "Dsus4") into a
 * structured ParsedChord with root, quality, intervals and optional slash bass.
 *
 * Longer quality tokens are matched first so "maj7" wins over "maj", etc.
 */

import { noteNameToPc, pcToName } from "./notes"
import type { ChordQuality, ParsedChord, PitchClass } from "./types"

interface QualityDef {
  /** Aliases as they may appear after the root, longest/most-specific first. */
  tokens: string[]
  quality: ChordQuality
  label: string
  intervals: number[]
}

/**
 * Quality table. Order matters: entries are tried top to bottom, and within the
 * matcher the longest matching token is preferred, so specific qualities
 * (maj7, m7b5) resolve before generic ones (maj, m).
 */
const QUALITIES: QualityDef[] = [
  { tokens: ["maj13", "M13"], quality: "maj13", label: "Major 13th", intervals: [0, 4, 7, 11, 14, 17, 21] },
  { tokens: ["m13", "min13", "-13"], quality: "m13", label: "Minor 13th", intervals: [0, 3, 7, 10, 14, 17, 21] },
  { tokens: ["13"], quality: "13", label: "Dominant 13th", intervals: [0, 4, 7, 10, 14, 17, 21] },
  { tokens: ["maj11", "M11"], quality: "maj11", label: "Major 11th", intervals: [0, 4, 7, 11, 14, 17] },
  { tokens: ["m11", "min11", "-11"], quality: "m11", label: "Minor 11th", intervals: [0, 3, 7, 10, 14, 17] },
  { tokens: ["11"], quality: "11", label: "Dominant 11th", intervals: [0, 4, 7, 10, 14, 17] },
  { tokens: ["maj7", "M7", "Δ7", "Δ"], quality: "maj7", label: "Major 7th", intervals: [0, 4, 7, 11] },
  { tokens: ["maj9", "M9"], quality: "maj9", label: "Major 9th", intervals: [0, 4, 7, 11, 14] },
  { tokens: ["m7b5", "min7b5", "ø", "ø7"], quality: "m7b5", label: "Half-Diminished 7th", intervals: [0, 3, 6, 10] },
  { tokens: ["dim7", "°7", "o7"], quality: "dim7", label: "Diminished 7th", intervals: [0, 3, 6, 9] },
  { tokens: ["dim", "°", "o"], quality: "dim", label: "Diminished", intervals: [0, 3, 6] },
  { tokens: ["aug", "+"], quality: "aug", label: "Augmented", intervals: [0, 4, 8] },
  { tokens: ["m9", "min9", "-9"], quality: "m9", label: "Minor 9th", intervals: [0, 3, 7, 10, 14] },
  { tokens: ["m7", "min7", "-7"], quality: "m7", label: "Minor 7th", intervals: [0, 3, 7, 10] },
  { tokens: ["m6", "min6", "-6"], quality: "m6", label: "Minor 6th", intervals: [0, 3, 7, 9] },
  { tokens: ["add9"], quality: "add9", label: "Add 9", intervals: [0, 4, 7, 14] },
  { tokens: ["7sus4", "7sus"], quality: "7sus4", label: "7 Suspended 4th", intervals: [0, 5, 7, 10] },
  { tokens: ["sus2"], quality: "sus2", label: "Suspended 2nd", intervals: [0, 2, 7] },
  { tokens: ["sus4", "sus"], quality: "sus4", label: "Suspended 4th", intervals: [0, 5, 7] },
  { tokens: ["maj", "M"], quality: "maj", label: "Major", intervals: [0, 4, 7] },
  { tokens: ["9"], quality: "9", label: "Dominant 9th", intervals: [0, 4, 7, 10, 14] },
  { tokens: ["7"], quality: "7", label: "Dominant 7th", intervals: [0, 4, 7, 10] },
  { tokens: ["6"], quality: "6", label: "Major 6th", intervals: [0, 4, 7, 9] },
  { tokens: ["5"], quality: "5", label: "Power Chord", intervals: [0, 7] },
  { tokens: ["m", "min", "-"], quality: "min", label: "Minor", intervals: [0, 3, 7] },
]

const INVALID: Omit<ParsedChord, "symbol"> = {
  rootPc: 0,
  rootName: "?",
  quality: "maj",
  qualityLabel: "Unknown",
  intervals: [],
  bassPc: null,
  bassName: null,
  valid: false,
}

/** Parse a single chord symbol. Never throws — returns valid:false on failure. */
export function parseChord(input: string): ParsedChord {
  const symbol = input.trim()
  if (!symbol) return { symbol, ...INVALID }

  // Split off a slash bass, if present.
  let body = symbol
  let bassPc: PitchClass | null = null
  let bassName: string | null = null
  const slashIndex = symbol.indexOf("/")
  if (slashIndex !== -1) {
    body = symbol.slice(0, slashIndex)
    const bassRaw = symbol.slice(slashIndex + 1).trim()
    const pc = noteNameToPc(bassRaw)
    if (pc !== null) {
      bassPc = pc
      bassName = bassRaw
    }
  }

  // Root: a letter plus optional accidentals.
  const rootMatch = body.match(/^([A-Ga-g][#b]*)/)
  if (!rootMatch) return { symbol, ...INVALID }
  const rootName = rootMatch[1][0].toUpperCase() + rootMatch[1].slice(1)
  const rootPc = noteNameToPc(rootName)
  if (rootPc === null) return { symbol, ...INVALID }

  const rest = body.slice(rootMatch[1].length)

  // Empty remainder = major triad.
  if (rest === "") {
    return {
      symbol,
      rootPc,
      rootName,
      quality: "maj",
      qualityLabel: "Major",
      intervals: [0, 4, 7],
      bassPc,
      bassName,
      valid: true,
    }
  }

  // Find the exact quality token that matches the remainder.
  let best: QualityDef | null = null
  for (const def of QUALITIES) {
    for (const token of def.tokens) {
      if (rest === token) {
        best = def
        break
      }
    }
    if (best) break
  }

  if (!best) {
    // Unknown suffix — flag as invalid so the UI can warn.
    return {
      symbol,
      rootPc,
      rootName,
      quality: "maj",
      qualityLabel: "Unknown",
      intervals: [0, 4, 7],
      bassPc,
      bassName,
      valid: false,
    }
  }

  return {
    symbol,
    rootPc,
    rootName,
    quality: best.quality,
    qualityLabel: best.label,
    intervals: best.intervals,
    bassPc,
    bassName,
    valid: true,
  }
}

function bestTokenLength(def: QualityDef, rest: string): number {
  let len = 0
  for (const token of def.tokens) {
    if (rest.startsWith(token) && token.length > len) len = token.length
  }
  return len
}

/** Note names that make up the chord (spelled with the given accidental). */
export function chordNoteNames(chord: ParsedChord, accidental: "sharp" | "flat" = "sharp"): string[] {
  if (!chord.valid) return []
  return chord.intervals.map((interval) => pcToName((chord.rootPc + interval) % 12, accidental))
}
