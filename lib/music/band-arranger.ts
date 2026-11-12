/**
 * BandMate — AI Band Arranger Engine.
 *
 * Generates multi-instrument arrangements (Drums, Bass, Keys, Guitar) for any
 * chord progression and song structure across distinct musical grooves.
 */

import type { Song, ChordEntry } from "./types"
import { parseChord } from "./chord-parser"
import { getVoicingMidis } from "./chords"
import { noteNameToPc } from "./notes"

export type GrooveStyle = "rock" | "funk" | "jazz" | "bossa" | "lofi"

export type BandTrackType = "drums" | "bass" | "keys" | "guitar"

export interface BandTrackConfig {
  id: BandTrackType
  name: string
  muted: boolean
  solo: boolean
  volume: number // 0 to 1
  pan: number // -1 to +1
}

export interface DrumEvent {
  type: "kick" | "snare" | "hihat" | "openhat" | "rim"
  beat: number // offset in beats from progression start
  velocity: number // 0 to 1
}

export interface NoteEvent {
  midis: number[]
  beat: number // offset in beats
  durationBeats: number
  velocity: number // 0 to 1
}

export interface BandArrangement {
  songTitle: string
  style: GrooveStyle
  bpm: number
  beatsPerBar: number
  totalBeats: number
  drums: DrumEvent[]
  bass: NoteEvent[]
  keys: NoteEvent[]
  guitar: NoteEvent[]
}

export const GROOVE_STYLES: { id: GrooveStyle; name: string; description: string; tempoMultiplier?: number }[] = [
  {
    id: "rock",
    name: "Classic Rock",
    description: "Driving 8th-note rock groove with solid kick-snare foundation and 8th-note bass",
  },
  {
    id: "funk",
    name: "Syncopated Funk",
    description: "Tight 16th-note pocket with ghost snares, slap bass syncopation, and sharp 9th comping",
  },
  {
    id: "jazz",
    name: "Acoustic Swing",
    description: "Quarter-note walking bass with chromatic approaches, feathered ride, and Charleston piano comps",
  },
  {
    id: "bossa",
    name: "Bossa Nova",
    description: "Subtle rim-shot clave, alternating root-5th bass, and gentle nylon guitar syncopation",
  },
  {
    id: "lofi",
    name: "Lo-Fi Hip-Hop",
    description: "Laid-back swung boom-bap drums, deep 808 sub bass, and lush open Rhodes chords",
  },
]

export const DEFAULT_BAND_TRACKS: BandTrackConfig[] = [
  { id: "drums", name: "Drum Kit", muted: false, solo: false, volume: 0.85, pan: 0 },
  { id: "bass", name: "Bass Guitar", muted: false, solo: false, volume: 0.9, pan: -0.1 },
  { id: "keys", name: "Keys / Piano", muted: false, solo: false, volume: 0.78, pan: -0.35 },
  { id: "guitar", name: "Rhythm Guitar", muted: false, solo: false, volume: 0.75, pan: 0.35 },
]

/**
 * Determine if a specific track should produce audio given current solo/mute states.
 * If any track has `solo === true`, only soloed tracks play (unless they are also muted).
 */
export function isTrackAudible(track: BandTrackConfig, allTracks: BandTrackConfig[]): boolean {
  if (track.muted) return false
  const anySolo = allTracks.some((t) => t.solo)
  if (anySolo) {
    return track.solo
  }
  return true
}

/**
 * Get the foundational root MIDI note for a chord in Bass register (C1 to B2 e.g. 24 to 47).
 */
export function getChordRootMidi(chordSymbol: string, register: "sub" | "mid" = "mid"): number {
  const parsed = parseChord(chordSymbol)
  const rootPc = parsed.bassPc ?? parsed.rootPc ?? 0

  // Register: "sub" for LoFi / Funk (24 to 35), "mid" for Rock / Jazz (36 to 47)
  const baseOctave = register === "sub" ? 24 : 36
  return baseOctave + rootPc
}

/**
 * Generate full multi-instrument band arrangement for a song.
 */
export function generateBandArrangement(song: Song, style: GrooveStyle = "rock"): BandArrangement {
  const flattenedChords: { chord: ChordEntry; startBeat: number; lengthBeats: number }[] = []
  let currentBeat = 0

  for (const section of song.sections) {
    for (const chord of section.chords) {
      const beats = Math.max(1, chord.beats)
      flattenedChords.push({ chord, startBeat: currentBeat, lengthBeats: beats })
      currentBeat += beats
    }
  }

  const totalBeats = Math.max(4, currentBeat)
  const beatsPerBar = song.beatsPerBar || 4

  const drums: DrumEvent[] = []
  const bass: NoteEvent[] = []
  const keys: NoteEvent[] = []
  const guitar: NoteEvent[] = []

  // 1. Generate Drums based on groove style
  for (let b = 0; b < totalBeats; b++) {
    const beatInBar = b % beatsPerBar

    if (style === "rock") {
      // Kick on 1 and 3 (in 4/4) or downbeats
      if (beatInBar === 0 || beatInBar === 2) {
        drums.push({ type: "kick", beat: b, velocity: 0.95 })
      }
      // Snare on 2 and 4
      if (beatInBar === 1 || beatInBar === 3) {
        drums.push({ type: "snare", beat: b, velocity: 0.9 })
      }
      // 8th-note hihats (on beat and off-beat)
      drums.push({ type: "hihat", beat: b, velocity: 0.7 })
      drums.push({ type: "hihat", beat: b + 0.5, velocity: 0.55 })
    } else if (style === "funk") {
      // Syncopated kick on beat 1 and 16th after beat 2
      if (beatInBar === 0) {
        drums.push({ type: "kick", beat: b, velocity: 0.95 })
      } else if (beatInBar === 2) {
        drums.push({ type: "kick", beat: b + 0.5, velocity: 0.85 })
      }
      // Snare on 2 & 4 with ghost notes
      if (beatInBar === 1 || beatInBar === 3) {
        drums.push({ type: "snare", beat: b, velocity: 0.92 })
      } else if (beatInBar === 0) {
        drums.push({ type: "snare", beat: b + 0.75, velocity: 0.35 }) // ghost snare
      }
      // 16th note hi-hat pattern
      drums.push({ type: "hihat", beat: b, velocity: 0.75 })
      drums.push({ type: "hihat", beat: b + 0.25, velocity: 0.4 })
      drums.push({ type: "hihat", beat: b + 0.5, velocity: 0.6 })
      drums.push({ type: "openhat", beat: b + 0.75, velocity: 0.5 })
    } else if (style === "jazz") {
      // Feathered kick on downbeats (subtle)
      if (beatInBar === 0) {
        drums.push({ type: "kick", beat: b, velocity: 0.45 })
      }
      // Snare rim on 2 and 4
      if (beatInBar === 1 || beatInBar === 3) {
        drums.push({ type: "rim", beat: b, velocity: 0.65 })
      }
      // Swing ride pattern (dotted 8th + 16th feel or triplet feel)
      drums.push({ type: "hihat", beat: b, velocity: 0.7 })
      drums.push({ type: "hihat", beat: b + 0.66, velocity: 0.5 })
    } else if (style === "bossa") {
      // Soft kick on beat 1 and syncopated beat 3
      if (beatInBar === 0) {
        drums.push({ type: "kick", beat: b, velocity: 0.75 })
      } else if (beatInBar === 2) {
        drums.push({ type: "kick", beat: b + 0.5, velocity: 0.7 })
      }
      // Bossa cross-stick rim pattern: 1, 2.5, 4, etc.
      if (beatInBar === 0 || (beatInBar === 1 && Math.random() > 0.4) || beatInBar === 3) {
        drums.push({ type: "rim", beat: b + (beatInBar === 1 ? 0.5 : 0), velocity: 0.8 })
      }
      // Constant straight 8th hihat
      drums.push({ type: "hihat", beat: b, velocity: 0.55 })
      drums.push({ type: "hihat", beat: b + 0.5, velocity: 0.45 })
    } else {
      // "lofi" boom-bap
      if (beatInBar === 0) {
        drums.push({ type: "kick", beat: b, velocity: 0.9 })
      } else if (beatInBar === 2) {
        drums.push({ type: "kick", beat: b + 0.6, velocity: 0.8 }) // relaxed swing kick
      }
      if (beatInBar === 1 || beatInBar === 3) {
        drums.push({ type: "snare", beat: b + 0.05, velocity: 0.85 }) // laid-back drag snare
      }
      drums.push({ type: "hihat", beat: b, velocity: 0.6 })
      drums.push({ type: "hihat", beat: b + 0.55, velocity: 0.45 })
    }
  }

  // 2. Generate Bass, Keys, and Guitar along chord boundaries
  for (let cIdx = 0; cIdx < flattenedChords.length; cIdx++) {
    const { chord, startBeat, lengthBeats } = flattenedChords[cIdx]
    const nextChord = flattenedChords[cIdx + 1]?.chord ?? flattenedChords[0]?.chord

    const rootMidi = getChordRootMidi(chord.symbol, style === "lofi" ? "sub" : "mid")
    const nextRootMidi = nextChord ? getChordRootMidi(nextChord.symbol, style === "lofi" ? "sub" : "mid") : rootMidi
    const parsedChord = parseChord(chord.symbol)
    const chordVoicing = getVoicingMidis(parsedChord, {
      voicingStyle: chord.voicingStyle === "standard" ? "standard" : (chord.voicingStyle ?? "standard"),
      octaveOffset: chord.octaveOffset ?? 0,
    })

    // Bassline generation
    if (style === "rock") {
      // Driving 8th-note or quarter-note pulse
      for (let b = 0; b < lengthBeats; b++) {
        bass.push({ midis: [rootMidi], beat: startBeat + b, durationBeats: 0.45, velocity: 0.85 })
        bass.push({ midis: [rootMidi], beat: startBeat + b + 0.5, durationBeats: 0.45, velocity: 0.72 })
      }
    } else if (style === "funk") {
      // Funky syncopated slap/finger pattern (root on 1, octave on and-of-2, 5th on 3)
      const octaveMidi = rootMidi + 12
      const fifthMidi = rootMidi + 7
      bass.push({ midis: [rootMidi], beat: startBeat, durationBeats: 0.75, velocity: 0.92 })
      if (lengthBeats >= 2) {
        bass.push({ midis: [octaveMidi], beat: startBeat + 1.5, durationBeats: 0.4, velocity: 0.82 })
      }
      if (lengthBeats >= 3) {
        bass.push({ midis: [fifthMidi], beat: startBeat + 2, durationBeats: 0.5, velocity: 0.85 })
      }
      if (lengthBeats >= 4) {
        bass.push({ midis: [rootMidi], beat: startBeat + 3.5, durationBeats: 0.4, velocity: 0.8 })
      }
    } else if (style === "jazz") {
      // Walking bassline: 4 quarter notes per bar with chromatic leading tone to next root
      for (let b = 0; b < lengthBeats; b++) {
        let note = rootMidi
        if (b === 0) {
          note = rootMidi // Root on beat 1
        } else if (b === 1) {
          note = rootMidi + 4 // Third or fifth
        } else if (b === 2) {
          note = rootMidi + 7 // Fifth
        } else if (b === lengthBeats - 1) {
          // Chromatic approach to the next root!
          note = nextRootMidi > rootMidi ? nextRootMidi - 1 : nextRootMidi + 1
        }
        bass.push({ midis: [note], beat: startBeat + b, durationBeats: 0.92, velocity: 0.88 })
      }
    } else if (style === "bossa") {
      // Alternating root-5th bossa bass
      const fifthMidi = rootMidi + 7
      bass.push({ midis: [rootMidi], beat: startBeat, durationBeats: 1.35, velocity: 0.85 })
      if (lengthBeats >= 2) {
        bass.push({ midis: [fifthMidi], beat: startBeat + 2, durationBeats: 1.35, velocity: 0.82 })
      }
    } else {
      // "lofi" sub bass
      bass.push({ midis: [rootMidi], beat: startBeat, durationBeats: Math.min(2.5, lengthBeats * 0.8), velocity: 0.88 })
      if (lengthBeats >= 3) {
        bass.push({ midis: [rootMidi], beat: startBeat + 2.5, durationBeats: 1.2, velocity: 0.75 })
      }
    }

    // Keys comping generation
    if (style === "jazz") {
      // Charleston comp: beat 1 and beat 2.5
      keys.push({ midis: chordVoicing, beat: startBeat, durationBeats: 1.2, velocity: 0.82 })
      if (lengthBeats >= 3) {
        keys.push({ midis: chordVoicing, beat: startBeat + 2.5, durationBeats: 0.9, velocity: 0.78 })
      }
    } else if (style === "funk") {
      // Syncopated 16th stabs on offbeats
      keys.push({ midis: chordVoicing, beat: startBeat + 0.5, durationBeats: 0.35, velocity: 0.86 })
      if (lengthBeats >= 2) {
        keys.push({ midis: chordVoicing, beat: startBeat + 1.75, durationBeats: 0.35, velocity: 0.82 })
      }
      if (lengthBeats >= 3) {
        keys.push({ midis: chordVoicing, beat: startBeat + 2.5, durationBeats: 0.35, velocity: 0.84 })
      }
    } else if (style === "rock") {
      // Solid sustained chord with pulse
      keys.push({ midis: chordVoicing, beat: startBeat, durationBeats: lengthBeats * 0.92, velocity: 0.85 })
    } else if (style === "bossa") {
      // Bossa syncopated comping
      keys.push({ midis: chordVoicing, beat: startBeat + 0.5, durationBeats: 0.8, velocity: 0.75 })
      if (lengthBeats >= 2) {
        keys.push({ midis: chordVoicing, beat: startBeat + 1.5, durationBeats: 0.8, velocity: 0.72 })
      }
      if (lengthBeats >= 3) {
        keys.push({ midis: chordVoicing, beat: startBeat + 3.0, durationBeats: 0.8, velocity: 0.74 })
      }
    } else {
      // "lofi" warm long pad chords
      keys.push({ midis: chordVoicing, beat: startBeat, durationBeats: lengthBeats * 0.96, velocity: 0.78 })
    }

    // Guitar rhythm strum generation
    if (style === "rock") {
      // Downstrokes on beats, upstrokes on half beats
      for (let b = 0; b < lengthBeats; b++) {
        guitar.push({ midis: chordVoicing, beat: startBeat + b, durationBeats: 0.45, velocity: 0.82 })
        guitar.push({ midis: chordVoicing, beat: startBeat + b + 0.5, durationBeats: 0.45, velocity: 0.68 })
      }
    } else if (style === "bossa") {
      // Gentle syncopated acoustic nylon guitar
      guitar.push({ midis: chordVoicing, beat: startBeat, durationBeats: 0.7, velocity: 0.78 })
      if (lengthBeats >= 2) {
        guitar.push({ midis: chordVoicing, beat: startBeat + 1.5, durationBeats: 0.7, velocity: 0.75 })
      }
      if (lengthBeats >= 3) {
        guitar.push({ midis: chordVoicing, beat: startBeat + 2.5, durationBeats: 0.7, velocity: 0.72 })
      }
    } else if (style === "funk") {
      // Scratch 16th rhythmic comps
      guitar.push({ midis: chordVoicing, beat: startBeat + 0.25, durationBeats: 0.2, velocity: 0.85 })
      guitar.push({ midis: chordVoicing, beat: startBeat + 0.75, durationBeats: 0.2, velocity: 0.78 })
      if (lengthBeats >= 2) {
        guitar.push({ midis: chordVoicing, beat: startBeat + 1.5, durationBeats: 0.2, velocity: 0.82 })
      }
    } else if (style === "jazz") {
      // Freddie Green 4-to-the-bar rhythm guitar
      for (let b = 0; b < lengthBeats; b++) {
        guitar.push({ midis: chordVoicing, beat: startBeat + b, durationBeats: 0.5, velocity: 0.72 })
      }
    } else {
      // "lofi" ambient acoustic acoustic guitar on chord change
      guitar.push({ midis: chordVoicing, beat: startBeat, durationBeats: Math.min(3, lengthBeats * 0.9), velocity: 0.75 })
    }
  }

  return {
    songTitle: song.title || "Untitled Song",
    style,
    bpm: song.bpm || 120,
    beatsPerBar,
    totalBeats,
    drums,
    bass,
    keys,
    guitar,
  }
}
