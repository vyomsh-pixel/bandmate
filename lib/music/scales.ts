/**
 * BandMate — Scale & key utilities.
 *
 * Diatonic scales, key spelling preferences, and diatonic chord suggestions.
 * Shared by Song Lab (key selector, transpose) and future modules.
 */

import { noteNameToPc, pcToName } from "./notes"
import type { Accidental, Key, PitchClass } from "./types"

/** Scale step patterns in semitones from the tonic. */
export const SCALE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const

/** Diatonic triad qualities for each scale degree. */
const DIATONIC_QUALITIES = {
  major: ["", "m", "m", "", "", "m", "dim"],
  minor: ["m", "dim", "", "m", "m", "", ""],
} as const

/** Roman numeral labels per degree. */
const ROMAN = {
  major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  minor: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
} as const

/**
 * Keys (by tonic name) that are conventionally spelled with flats.
 * Everything else defaults to sharps.
 */
const FLAT_MAJOR_TONICS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"])
const FLAT_MINOR_TONICS = new Set(["D", "G", "C", "F", "Bb", "Eb"])

/** All 12 major tonic spellings offered in the UI. */
export const MAJOR_TONICS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]
/** All 12 minor tonic spellings offered in the UI. */
export const MINOR_TONICS = ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"]

/** Decide sharp vs flat spelling for a key. */
export function keyAccidental(tonic: string, mode: "major" | "minor"): Accidental {
  if (tonic.includes("b")) return "flat"
  if (tonic.includes("#")) return "sharp"
  const set = mode === "major" ? FLAT_MAJOR_TONICS : FLAT_MINOR_TONICS
  return set.has(tonic) ? "flat" : "sharp"
}

/** Build a Key object from tonic + mode. */
export function makeKey(tonic: string, mode: "major" | "minor"): Key {
  return {
    tonic,
    mode,
    label: `${tonic} ${mode === "major" ? "Major" : "Minor"}`,
    accidental: keyAccidental(tonic, mode),
  }
}

/** Pitch classes of the scale for a key. */
export function scalePitchClasses(key: Key): PitchClass[] {
  const tonicPc = noteNameToPc(key.tonic) ?? 0
  return SCALE_STEPS[key.mode].map((step) => ((tonicPc + step) % 12) as PitchClass)
}

/** Is a pitch class diatonic to the key? */
export function isInKey(pc: PitchClass, key: Key): boolean {
  return scalePitchClasses(key).includes(((pc % 12) + 12) % 12)
}

/** A diatonic chord suggestion. */
export interface DiatonicChord {
  degree: number
  roman: string
  symbol: string
}

/** Diatonic triads for a key, e.g. for quick progression building. */
export function diatonicChords(key: Key): DiatonicChord[] {
  const tonicPc = noteNameToPc(key.tonic) ?? 0
  const acc = key.accidental
  return SCALE_STEPS[key.mode].map((step, i) => {
    const rootPc = (tonicPc + step) % 12
    const suffix = DIATONIC_QUALITIES[key.mode][i]
    return {
      degree: i + 1,
      roman: ROMAN[key.mode][i],
      symbol: `${pcToName(rootPc, acc)}${suffix}`,
    }
  })
}
