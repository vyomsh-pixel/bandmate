/**
 * BandMate — Note & pitch-class utilities.
 *
 * Pure functions for converting between note names, pitch classes, and MIDI
 * numbers. Shared by the chord parser, voicing engine, transposer and audio
 * engine.
 */

import type { Accidental, Note, PitchClass } from "./types"

/** Note names using sharps, indexed by pitch class. */
export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const

/** Note names using flats, indexed by pitch class. */
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const

/** Base natural-note pitch classes. */
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/**
 * Convert a written note name (e.g. "C", "F#", "Bb", "E#") to a pitch class.
 * Returns null when the name is not a valid note letter.
 */
export function noteNameToPc(name: string): PitchClass | null {
  const match = name.trim().match(/^([A-Ga-g])([#b]*)$/)
  if (!match) return null
  const letter = match[1].toUpperCase()
  let pc = LETTER_PC[letter]
  if (pc === undefined) return null
  for (const acc of match[2]) {
    pc += acc === "#" ? 1 : -1
  }
  return ((pc % 12) + 12) % 12
}

/** Spell a pitch class using the given accidental preference. */
export function pcToName(pc: PitchClass, accidental: Accidental = "sharp"): string {
  const norm = ((pc % 12) + 12) % 12
  return accidental === "flat" ? FLAT_NAMES[norm] : SHARP_NAMES[norm]
}

/** Build a MIDI number from a pitch class and octave (C4 = 60). */
export function toMidi(pc: PitchClass, octave: number): number {
  return (octave + 1) * 12 + (((pc % 12) + 12) % 12)
}

/** Convert a MIDI number to a frequency in Hz (A4 = 440). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Build a fully-resolved Note from a pitch class + octave. */
export function makeNote(pc: PitchClass, octave: number, accidental: Accidental = "sharp"): Note {
  const norm = ((pc % 12) + 12) % 12
  return {
    pc: norm,
    octave,
    name: pcToName(norm, accidental),
    midi: toMidi(norm, octave),
  }
}

/** Octave that a MIDI note lives in (C4 = 60 -> 4). */
export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1
}

/** Pitch class of a MIDI note. */
export function midiToPc(midi: number): PitchClass {
  return ((midi % 12) + 12) % 12
}

/** Display name for a MIDI note including octave, e.g. "C4". */
export function midiToName(midi: number, accidental: Accidental = "sharp"): string {
  return `${pcToName(midiToPc(midi), accidental)}${midiToOctave(midi)}`
}
