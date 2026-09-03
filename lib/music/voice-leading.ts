import { allInversions } from "./chords"
import type { Note, ParsedChord } from "./types"

/**
 * Voice leading utilities for moving smoothly between chords.
 */

/**
 * Calculates the "voice leading distance" between two voicings.
 * A smaller distance means smoother movement.
 * Expects both voicings to have roughly the same number of notes.
 */
export function voiceLeadingDistance(voicingA: Note[], voicingB: Note[]): number {
  if (voicingA.length === 0 || voicingB.length === 0) return Infinity
  
  // A simple strategy is to sum the absolute semitone differences between corresponding voices.
  // This assumes the arrays are sorted low to high.
  let distance = 0
  const maxVoices = Math.max(voicingA.length, voicingB.length)
  
  for (let i = 0; i < maxVoices; i++) {
    const a = voicingA[Math.min(i, voicingA.length - 1)]
    const b = voicingB[Math.min(i, voicingB.length - 1)]
    distance += Math.abs(a.midi - b.midi)
  }
  
  return distance
}

/**
 * Given a starting voicing and a target chord, suggests the inversion of the target chord
 * that results in the smoothest voice leading.
 */
export function suggestSmoothInversion(
  currentVoicing: Note[], 
  targetChord: ParsedChord, 
  accidental: "sharp" | "flat" = "sharp"
): number {
  if (!targetChord.valid || currentVoicing.length === 0) return 0
  
  const targetInversions = allInversions(targetChord, { octave: 4, accidental })
  if (targetInversions.length === 0) return 0
  
  let bestInversion = 0
  let minDistance = Infinity
  
  for (const inv of targetInversions) {
    // Check inversion directly and with octave shifts to find true minimal distance
    for (const octaveShift of [-12, 0, 12]) {
      const shiftedNotes = inv.notes.map((n) => ({ ...n, midi: n.midi + octaveShift }))
      const dist = voiceLeadingDistance(currentVoicing, shiftedNotes)
      if (dist < minDistance) {
        minDistance = dist
        bestInversion = inv.inversion
      }
    }
  }
  
  return bestInversion
}
