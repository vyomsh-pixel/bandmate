/**
 * BandMate — Transposition engine.
 *
 * Shifts chord symbols and progressions by a number of semitones, re-spelling
 * roots and slash-basses using a target accidental preference. Non-root text
 * (qualities/extensions) is preserved verbatim.
 */

import { parseChord } from "./chord-parser"
import { noteNameToPc, pcToName } from "./notes"
import { keyAccidental } from "./scales"
import type { Accidental, ChordEntry } from "./types"

/**
 * Transpose a single chord symbol by `semitones`, spelling notes with the given
 * accidental preference. Returns the original text if it cannot be parsed.
 */
export function transposeSymbol(symbol: string, semitones: number, accidental: Accidental): string {
  const chord = parseChord(symbol)
  if (!chord.valid) return symbol

  const shift = (pc: number) => (((pc + semitones) % 12) + 12) % 12
  const newRoot = pcToName(shift(chord.rootPc), accidental)

  // Preserve the quality/extension text exactly as written.
  const rootMatch = symbol.trim().match(/^([A-Ga-g][#b]*)/)
  const rootLen = rootMatch ? rootMatch[1].length : 1
  const afterRoot = symbol.trim().slice(rootLen)

  // Handle a slash bass separately.
  const slashIndex = afterRoot.indexOf("/")
  if (slashIndex !== -1) {
    const qualityPart = afterRoot.slice(0, slashIndex)
    const bassRaw = afterRoot.slice(slashIndex + 1).trim()
    const bassPc = noteNameToPc(bassRaw)
    const newBass = bassPc !== null ? pcToName(shift(bassPc), accidental) : bassRaw
    return `${newRoot}${qualityPart}/${newBass}`
  }

  return `${newRoot}${afterRoot}`
}

/** Semitone distance between two tonic names (target - source). */
export function semitonesBetween(fromTonic: string, toTonic: string): number {
  const a = noteNameToPc(fromTonic) ?? 0
  const b = noteNameToPc(toTonic) ?? 0
  return (((b - a) % 12) + 12) % 12
}

/** Transpose an entire progression by a number of semitones. */
export function transposeProgression(
  chords: ChordEntry[],
  semitones: number,
  targetTonic: string,
  mode: "major" | "minor",
): ChordEntry[] {
  const accidental = keyAccidental(targetTonic, mode)
  return chords.map((entry) => ({
    ...entry,
    symbol: transposeSymbol(entry.symbol, semitones, accidental),
  }))
}
