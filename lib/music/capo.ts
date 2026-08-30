import { parseChord } from "./chord-parser"
import { noteNameToPc, pcToName } from "./notes"
import { keyAccidental, makeKey } from "./scales"
import { transposeSymbol } from "./transpose"
import type { ChordEntry, Key } from "./types"

/**
 * Capo utilities for guitar.
 */

/**
 * Given a chord symbol and a capo fret, return the chord shape the guitarist needs to play.
 * Example: original "F", capo 5 -> returns "C" shape.
 * This is effectively transposing down by the capo fret amount.
 */
export function chordShapeForCapo(symbol: string, capoFret: number, targetAccidental: "sharp" | "flat" = "sharp"): string {
  // To find the shape, we transpose DOWN by the capo fret.
  // Because if you play a C shape at Capo 5, it sounds like an F.
  // F transposed down 5 semitones is C.
  return transposeSymbol(symbol, -capoFret, targetAccidental)
}

/**
 * Given a progression of chords and an original key, suggest the best capo frets.
 * "Best" usually means maximizing open chords (C, G, D, A, E, Em, Am, Dm).
 */
export function suggestCapo(chords: string[], originalKey?: Key): { fret: number; score: number }[] {
  const openRoots = ["C", "G", "D", "A", "E"]
  
  const scores: { fret: number; score: number }[] = []
  
  for (let fret = 0; fret <= 7; fret++) {
    let score = 0
    const accidental = originalKey ? originalKey.accidental : "sharp"
    
    for (const chord of chords) {
      const shape = chordShapeForCapo(chord, fret, accidental)
      const parsed = parseChord(shape)
      if (parsed.valid) {
        if (openRoots.includes(parsed.rootName)) {
           // Basic open major/minor chords get highest score
           if (parsed.quality === "maj" || parsed.quality === "min") {
              score += 2
           } else {
              score += 1
           }
        }
      }
    }
    
    scores.push({ fret, score })
  }
  
  // Sort descending by score
  return scores.sort((a, b) => b.score - a.score)
}
