/**
 * BandMate — Chord voicing & inversion engine.
 *
 * Converts a ParsedChord into concrete Notes (with octaves + MIDI numbers) and
 * derives inversions. Consumed by the piano keyboard visualizer and the audio
 * engine, and later by Instrument Lab / Gesture Play.
 */

import { makeNote } from "./notes"
import type { Accidental, Note, ParsedChord } from "./types"

export interface Voicing {
  /** Notes from lowest to highest. */
  notes: Note[]
  /** Inversion index (0 = root position). */
  inversion: number
  /** Human label, e.g. "Root Position", "1st Inversion". */
  label: string
}

const INVERSION_LABELS = ["Root Position", "1st Inversion", "2nd Inversion", "3rd Inversion", "4th Inversion"]

/**
 * Build a close-position voicing for a chord starting at the given octave.
 * Notes ascend; when an interval wraps below the previous note we bump the
 * octave so the voicing always moves upward.
 */
export function voiceChord(
  chord: ParsedChord,
  options: { octave?: number; accidental?: Accidental } = {},
): Note[] {
  const { octave = 4, accidental = "sharp" } = options
  if (!chord.valid || chord.intervals.length === 0) return []

  const notes: Note[] = []
  let lastMidi = -Infinity
  for (const interval of chord.intervals) {
    const pc = (chord.rootPc + interval) % 12
    let oct = octave
    // Keep ascending relative to the previous note.
    let note = makeNote(pc, oct, accidental)
    while (note.midi <= lastMidi) {
      oct += 1
      note = makeNote(pc, oct, accidental)
    }
    notes.push(note)
    lastMidi = note.midi
  }
  return notes
}

/**
 * Apply an inversion to a root-position voicing by moving the lowest `n` notes
 * up an octave.
 */
export function invertVoicing(rootVoicing: Note[], inversion: number, accidental: Accidental = "sharp"): Note[] {
  if (rootVoicing.length === 0) return []
  const n = ((inversion % rootVoicing.length) + rootVoicing.length) % rootVoicing.length
  const notes = rootVoicing.map((note) => ({ ...note }))
  for (let i = 0; i < n; i++) {
    const moved = notes.shift()
    if (!moved) break
    notes.push(makeNote(moved.pc, moved.octave + 1, accidental))
  }
  // Re-sort ascending by midi for a stable keyboard rendering.
  return notes.sort((a, b) => a.midi - b.midi)
}

/** All inversions of a chord (root position + one per additional chord tone). */
export function allInversions(chord: ParsedChord, options: { octave?: number; accidental?: Accidental } = {}): Voicing[] {
  const root = voiceChord(chord, options)
  if (root.length === 0) return []
  const accidental = options.accidental ?? "sharp"
  return root.map((_, i) => ({
    notes: invertVoicing(root, i, accidental),
    inversion: i,
    label: INVERSION_LABELS[i] ?? `${i}th Inversion`,
  }))
}

/**
 * Full playable voicing including an optional slash-bass note placed an octave
 * below the chord. Used by the audio engine.
 */
export function playableVoicing(
  chord: ParsedChord,
  options: { octave?: number; accidental?: Accidental; inversion?: number } = {},
): Note[] {
  const { octave = 4, accidental = "sharp", inversion = 0 } = options
  const root = voiceChord(chord, { octave, accidental })
  const voiced = invertVoicing(root, inversion, accidental)
  if (chord.bassPc !== null) {
    const bass = makeNote(chord.bassPc, octave - 1, accidental)
    return [bass, ...voiced]
  }
  return voiced
}
