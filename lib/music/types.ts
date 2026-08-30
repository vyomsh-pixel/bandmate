/**
 * BandMate — Shared music data models.
 *
 * These types are the contract shared across every current and future module
 * (Song Lab, Instrument Lab, Gesture Play, Setlists, AI Medley Builder, Band
 * Mode). Keep them engine-agnostic: no React, no audio, no storage concerns.
 */

/** A pitch class 0-11 where 0 = C, 1 = C#, ... 11 = B. */
export type PitchClass = number

/** Accidental spelling preference used when naming notes. */
export type Accidental = "sharp" | "flat"

/** A concrete note with an octave, resolvable to a MIDI number. */
export interface Note {
  /** Pitch class 0-11. */
  pc: PitchClass
  /** Scientific-pitch octave (middle C = C4 = MIDI 60). */
  octave: number
  /** Preferred spelling, e.g. "C#" or "Db". */
  name: string
  /** MIDI note number. */
  midi: number
}

/** Chord quality identifiers understood by the parser + voicing engine. */
export type ChordQuality =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "sus2"
  | "sus4"
  | "5"
  | "6"
  | "m6"
  | "7"
  | "maj7"
  | "m7"
  | "m7b5"
  | "dim7"
  | "9"
  | "maj9"
  | "m9"
  | "add9"
  | "11"
  | "maj11"
  | "m11"
  | "13"
  | "maj13"
  | "m13"
  | "7sus4"

/** A fully parsed chord symbol. */
export interface ParsedChord {
  /** Original text, e.g. "F#m7/A". */
  symbol: string
  /** Root pitch class. */
  rootPc: PitchClass
  /** Root spelling as written, e.g. "F#". */
  rootName: string
  /** Resolved quality. */
  quality: ChordQuality
  /** Human label for the quality, e.g. "Minor 7th". */
  qualityLabel: string
  /** Intervals in semitones from the root that make up the chord. */
  intervals: number[]
  /** Optional slash-bass pitch class. */
  bassPc: PitchClass | null
  /** Optional slash-bass spelling. */
  bassName: string | null
  /** Whether the symbol parsed cleanly. */
  valid: boolean
}

/** Musical key (tonic + mode). */
export interface Key {
  /** e.g. "C", "F#", "Bb". */
  tonic: string
  mode: "major" | "minor"
  /** Convenience label, e.g. "C Major" or "A Minor". */
  label: string
  /** Preferred accidental spelling for notes in this key. */
  accidental: Accidental
}

/** One chord slot in a progression. */
export interface ChordEntry {
  id: string
  /** Chord symbol text, e.g. "Cmaj7". */
  symbol: string
  /** Duration in beats. */
  beats: number
}

/** A named section of the song, grouping multiple chords. */
export interface Section {
  id: string
  name: string
  chords: ChordEntry[]
  color?: string
}

/** A saved song project. */
export interface Song {
  id: string
  title: string
  /** Tonic string, e.g. "C" or "A". */
  keyTonic: string
  keyMode: "major" | "minor"
  bpm: number
  beatsPerBar: number
  sections: Section[]
  createdAt: number
  updatedAt: number
}
