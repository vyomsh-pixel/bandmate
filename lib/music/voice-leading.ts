import { allInversions, voiceChord, invertVoicing } from "./chords"
import { makeNote } from "./notes"
import type { Accidental, Note, ParsedChord } from "./types"

/**
 * BandMate — Advanced 4-Part Voice Leading & Polyphonic Orchestration Engine.
 *
 * Models classic 4-part SATB harmony (Soprano, Alto, Tenor, Bass),
 * professional voicing styles (Close, Drop-2, Shell, Open),
 * voice-leading distance calculations, voice movement trajectories,
 * and smoothness scoring.
 */

export type VoicingStyle = "close" | "drop2" | "shell" | "open"

export interface VoiceAssignment {
  voice: "bass" | "tenor" | "alto" | "soprano"
  note: Note
}

export interface VoiceLeadingStep {
  fromChord: string
  toChord: string
  voices: {
    voice: "bass" | "tenor" | "alto" | "soprano"
    fromNote: Note
    toNote: Note
    semitones: number // signed (+ ascending, - descending, 0 common tone)
    motion: "parallel" | "contrary" | "oblique" | "static"
  }[]
  totalDistance: number
  smoothnessScore: number // 0 to 100%
  hasParallelFifthsOrOctaves: boolean
}

/**
 * Generates notes for a specific musical voicing style:
 * - 'close': Standard tight cluster (triad/7th within one octave)
 * - 'drop2': Second-highest voice dropped down one octave (classic jazz piano/guitar voicing)
 * - 'shell': Essential harmony only (Bass root/slash + 3rd + 7th), leaves open air for melody
 * - 'open': Spread voicing across octaves for cinematic/ambient piano
 */
export function voiceChordInStyle(
  chord: ParsedChord,
  style: VoicingStyle = "close",
  options: { octave?: number; accidental?: Accidental; inversion?: number } = {},
): Note[] {
  const { octave = 4, accidental = "sharp", inversion = 0 } = options
  if (!chord.valid || chord.intervals.length === 0) return []

  const baseNotes = invertVoicing(voiceChord(chord, { octave, accidental }), inversion, accidental)
  if (baseNotes.length === 0) return []

  if (style === "close") {
    return baseNotes
  }

  if (style === "drop2") {
    // Drop the second highest note down by an octave
    if (baseNotes.length < 3) return baseNotes
    const sorted = [...baseNotes].sort((a, b) => a.midi - b.midi)
    const dropIndex = sorted.length - 2
    const droppedNote = makeNote(sorted[dropIndex].pc, sorted[dropIndex].octave - 1, accidental)
    const result = [droppedNote, ...sorted.filter((_, idx) => idx !== dropIndex)]
    return result.sort((a, b) => a.midi - b.midi)
  }

  if (style === "shell") {
    // Keep root (or bass), 3rd (approx semitones 3 or 4), and 7th (approx semitones 9, 10, or 11)
    const rootPc = chord.bassPc !== null ? chord.bassPc : chord.rootPc
    const guideToneIntervals: number[] = chord.intervals.filter((i) => i === 3 || i === 4 || i === 9 || i === 10 || i === 11)
    
    // Fallback if triad: include interval 7
    if (guideToneIntervals.length < 2) {
      if (chord.intervals.includes(7)) guideToneIntervals.push(7)
    }

    const bass = makeNote(rootPc, octave - 1, accidental)
    const guides = guideToneIntervals.map((interval) => {
      const pc = (chord.rootPc + interval) % 12
      return makeNote(pc, octave, accidental)
    })

    return [bass, ...guides].sort((a, b) => a.midi - b.midi)
  }

  if (style === "open") {
    // Spread voicing: keep the same number of notes, alternating voices upward by an octave
    const sorted = [...baseNotes].sort((a, b) => a.midi - b.midi)
    const spread = sorted.map((n, idx) => {
      if (idx === sorted.length - 1 || idx === 1) {
        return makeNote(n.pc, n.octave + 1, accidental)
      }
      return n
    })
    return spread.sort((a, b) => a.midi - b.midi)
  }

  return baseNotes
}

/**
 * Assigns concrete notes to SATB (Soprano, Alto, Tenor, Bass) voices.
 * Ensures consistent 4-voice tracking for visualization and animation.
 */
export function assignSATBVoices(notes: Note[]): VoiceAssignment[] {
  if (notes.length === 0) return []
  const sorted = [...notes].sort((a, b) => a.midi - b.midi)

  if (sorted.length === 1) {
    return [
      { voice: "bass", note: sorted[0] },
      { voice: "tenor", note: sorted[0] },
      { voice: "alto", note: sorted[0] },
      { voice: "soprano", note: sorted[0] },
    ]
  }

  if (sorted.length === 2) {
    return [
      { voice: "bass", note: sorted[0] },
      { voice: "tenor", note: sorted[0] },
      { voice: "alto", note: sorted[1] },
      { voice: "soprano", note: sorted[1] },
    ]
  }

  if (sorted.length === 3) {
    return [
      { voice: "bass", note: sorted[0] },
      { voice: "tenor", note: sorted[1] },
      { voice: "alto", note: sorted[1] },
      { voice: "soprano", note: sorted[2] },
    ]
  }

  // 4 or more notes
  return [
    { voice: "bass", note: sorted[0] },
    { voice: "tenor", note: sorted[1] },
    { voice: "alto", note: sorted[sorted.length - 2] },
    { voice: "soprano", note: sorted[sorted.length - 1] },
  ]
}

/**
 * Calculates the voice leading distance between two voicings.
 * A smaller distance means smoother movement.
 */
export function voiceLeadingDistance(voicingA: Note[], voicingB: Note[]): number {
  if (voicingA.length === 0 || voicingB.length === 0) return Infinity

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
 * Analyzes step-by-step voice movement between two consecutive chords.
 */
export function analyzeVoiceLeadingStep(
  fromVoicing: Note[],
  toVoicing: Note[],
  fromSymbol: string,
  toSymbol: string,
): VoiceLeadingStep {
  const satbFrom = assignSATBVoices(fromVoicing)
  const satbTo = assignSATBVoices(toVoicing)

  const voices: VoiceLeadingStep["voices"] = []
  let totalDistance = 0

  for (let i = 0; i < 4; i++) {
    const f = satbFrom[i]
    const t = satbTo[i]
    const semitones = t.note.midi - f.note.midi
    totalDistance += Math.abs(semitones)

    let motion: "parallel" | "contrary" | "oblique" | "static" = "static"
    if (semitones === 0) {
      motion = "static"
    } else {
      const bassDelta = satbTo[0].note.midi - satbFrom[0].note.midi
      if (bassDelta === 0) {
        motion = "oblique"
      } else if ((semitones > 0 && bassDelta > 0) || (semitones < 0 && bassDelta < 0)) {
        motion = "parallel"
      } else {
        motion = "contrary"
      }
    }

    voices.push({
      voice: f.voice,
      fromNote: f.note,
      toNote: t.note,
      semitones,
      motion,
    })
  }

  // Smoothness score: 100% when total movement is <= 2 semitones, scaling down to 0% at >= 16 semitones
  const smoothnessScore = Math.max(0, Math.min(100, Math.round(100 - (totalDistance / 16) * 100)))

  // Check parallel fifths / octaves between soprano and bass
  const fromInterval = Math.abs(satbFrom[3].note.midi - satbFrom[0].note.midi) % 12
  const toInterval = Math.abs(satbTo[3].note.midi - satbTo[0].note.midi) % 12
  const hasParallelFifthsOrOctaves =
    (fromInterval === 7 && toInterval === 7) ||
    (fromInterval === 0 && toInterval === 0 && voices[0].semitones !== 0 && voices[3].semitones !== 0)

  return {
    fromChord: fromSymbol,
    toChord: toSymbol,
    voices,
    totalDistance,
    smoothnessScore,
    hasParallelFifthsOrOctaves,
  }
}

/**
 * Given a starting voicing and a target chord, suggests the inversion of the target chord
 * that results in the smoothest voice leading.
 */
export function suggestSmoothInversion(
  currentVoicing: Note[],
  targetChord: ParsedChord,
  accidental: "sharp" | "flat" = "sharp",
): number {
  if (!targetChord.valid || currentVoicing.length === 0) return 0

  const targetInversions = allInversions(targetChord, { octave: 4, accidental })
  if (targetInversions.length === 0) return 0

  let bestInversion = 0
  let minDistance = Infinity

  for (const inv of targetInversions) {
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
