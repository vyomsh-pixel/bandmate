import { ChordEntry, Section, Song } from "./types"
import { makeKey } from "./scales"
import { parseChord } from "./chord-parser"
import { semitonesBetween } from "./transpose"
import { autoVoiceProgression } from "./voice-leading"
import { createId } from "../storage/local-store"

export interface MedleyTransitionPlan {
  fromSong: Song
  toSong: Song
  transitionChords: ChordEntry[]
  strategy: string
  bpmRamp: { fromBpm: number; toBpm: number; isAccelerando: boolean }
}

/**
 * Compute an intelligent harmonic transition between two songs.
 * Chooses an optimal pivot, secondary dominant, or turnaround progression.
 */
export function generateMedleyTransition(
  songA: Song,
  songB: Song,
): MedleyTransitionPlan {
  const allAChords = songA.sections.flatMap((s) => s.chords)
  const allBChords = songB.sections.flatMap((s) => s.chords)

  const lastChordSymbol = allAChords[allAChords.length - 1]?.symbol ?? songA.keyTonic
  const firstChordSymbol = allBChords[0]?.symbol ?? songB.keyTonic

  const targetTonic = songB.keyTonic
  const targetMode = songB.keyMode
  const diffSemitones = (semitonesBetween(songA.keyTonic, songB.keyTonic) + 12) % 12

  let symbols: string[] = []
  let strategy = "Harmonic Turnaround"

  if (songA.keyTonic === songB.keyTonic && songA.keyMode === songB.keyMode) {
    // Same key: classic ii - V7 turnaround into opening chord
    strategy = "Diatonic Turnaround (ii - V7)"
    const targetKey = makeKey(targetTonic, targetMode)
    symbols = targetMode === "major"
      ? [`${targetTonic}maj7`, "Dm7", "G7"]
      : [`${targetTonic}m`, "Bdim", "E7"]
  } else if (diffSemitones === 7 || diffSemitones === 5) {
    // Circle of 5ths adjacent: Pivot cadence
    strategy = "Circle of 5ths Modulation (Pivot Dominant)"
    // Insert dominant 7th of target key
    const dominantPc = (parseChord(targetTonic).rootPc + 7) % 12
    const targetKey = makeKey(targetTonic, targetMode)
    const domChord = targetKey.accidental === "flat" ? "F7" : "G7"
    symbols = ["F", `${targetTonic}maj7`, domChord]
  } else if (diffSemitones === 2) {
    // Step-up modulation (+2 semitones, classic truck driver's gear shift!)
    strategy = "Ascending Step Modulation (V/target)"
    symbols = [lastChordSymbol, `${targetTonic}sus4`, `${targetTonic}7`]
  } else {
    // Chromatic or distant keys: Tritone substitution or secondary dominant
    strategy = "Secondary Dominant Voice-Leading Bridge"
    symbols = [lastChordSymbol, `${songA.keyTonic}7`, `${targetTonic}7sus4`, `${targetTonic}7`]
  }

  // Ensure first chord of Song B is smoothly pre-empted
  if (!symbols.includes(firstChordSymbol)) {
    symbols.push(firstChordSymbol)
  }

  // Convert to ChordEntry models with 4 beats each
  const rawChords: ChordEntry[] = symbols.map((sym) => ({
    id: createId(),
    symbol: sym,
    beats: 4,
  }))

  // Auto-voice the transition chords with SATB polyphony
  const voicedChords = autoVoiceProgression(rawChords, { voicingStyle: "close" })

  return {
    fromSong: songA,
    toSong: songB,
    transitionChords: voicedChords,
    strategy,
    bpmRamp: {
      fromBpm: songA.bpm,
      toBpm: songB.bpm,
      isAccelerando: songB.bpm > songA.bpm,
    },
  }
}

/**
 * Merge two songs and an AI-calculated transition bridge into a single medley song.
 */
export function createMedleySong(
  songA: Song,
  songB: Song,
  medleyTitle?: string,
): Song {
  const plan = generateMedleyTransition(songA, songB)

  const transitionSection: Section = {
    id: createId(),
    name: `Bridge: ${songA.title} → ${songB.title}`,
    color: "#f59e0b",
    chords: plan.transitionChords,
  }

  // Clone sections with fresh IDs to prevent collisions
  const clonedASections: Section[] = songA.sections.map((s) => ({
    ...s,
    id: createId(),
    name: `${songA.title}: ${s.name}`,
    chords: s.chords.map((c) => ({ ...c, id: createId() })),
  }))

  const clonedBSections: Section[] = songB.sections.map((s) => ({
    ...s,
    id: createId(),
    name: `${songB.title}: ${s.name}`,
    chords: s.chords.map((c) => ({ ...c, id: createId() })),
  }))

  const avgBpm = Math.round((songA.bpm + songB.bpm) / 2)

  return {
    id: createId(),
    title: medleyTitle || `${songA.title} / ${songB.title} (Medley)`,
    keyTonic: songA.keyTonic,
    keyMode: songA.keyMode,
    bpm: avgBpm,
    beatsPerBar: songA.beatsPerBar,
    sections: [...clonedASections, transitionSection, ...clonedBSections],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
