import { describe, it, expect } from "vitest"
import { Song } from "../types"
import { generateMedleyTransition, createMedleySong } from "../medley-engine"

const MOCK_SONG_A: Song = {
  id: "song-a",
  title: "Summer Groove",
  keyTonic: "C",
  keyMode: "major",
  bpm: 120,
  beatsPerBar: 4,
  sections: [
    {
      id: "sec-a1",
      name: "Verse",
      chords: [
        { id: "c1", symbol: "C", beats: 4 },
        { id: "c2", symbol: "G", beats: 4 },
        { id: "c3", symbol: "Am", beats: 4 },
        { id: "c4", symbol: "F", beats: 4 },
      ],
    },
  ],
  createdAt: 1000,
  updatedAt: 1000,
}

const MOCK_SONG_B: Song = {
  id: "song-b",
  title: "Autumn Leaves",
  keyTonic: "D",
  keyMode: "major",
  bpm: 130,
  beatsPerBar: 4,
  sections: [
    {
      id: "sec-b1",
      name: "Chorus",
      chords: [
        { id: "cb1", symbol: "D", beats: 4 },
        { id: "cb2", symbol: "A", beats: 4 },
        { id: "cb3", symbol: "Bm", beats: 4 },
        { id: "cb4", symbol: "G", beats: 4 },
      ],
    },
  ],
  createdAt: 2000,
  updatedAt: 2000,
}

describe("Medley Engine", () => {
  it("generates a valid transition plan between two songs", () => {
    const plan = generateMedleyTransition(MOCK_SONG_A, MOCK_SONG_B)
    expect(plan.fromSong.title).toBe("Summer Groove")
    expect(plan.toSong.title).toBe("Autumn Leaves")
    expect(plan.transitionChords.length).toBeGreaterThan(0)
    expect(plan.bpmRamp.fromBpm).toBe(120)
    expect(plan.bpmRamp.toBpm).toBe(130)
    expect(plan.bpmRamp.isAccelerando).toBe(true)
  })

  it("merges two songs into a single unified medley song with a transition bridge", () => {
    const medley = createMedleySong(MOCK_SONG_A, MOCK_SONG_B)
    expect(medley.title).toContain("Summer Groove / Autumn Leaves")
    // Total sections: Song A (1) + Bridge (1) + Song B (1) = 3
    expect(medley.sections.length).toBe(3)
    expect(medley.sections[1].name).toContain("Bridge")
    expect(medley.sections[1].chords.length).toBeGreaterThan(0)
  })
})
