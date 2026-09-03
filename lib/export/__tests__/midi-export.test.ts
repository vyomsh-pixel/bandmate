import { describe, it, expect } from "vitest"
import { generateMidiFile } from "../midi-export"
import type { Song } from "../../music/types"

describe("MIDI Export Engine", () => {
  it("generates a valid Standard MIDI File binary header", () => {
    const mockSong: Song = {
      id: "song-1",
      title: "Test Groove",
      keyTonic: "C",
      keyMode: "major",
      bpm: 120,
      beatsPerBar: 4,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [
        {
          id: "sec-1",
          name: "Verse",
          chords: [
            { id: "c1", symbol: "C", beats: 4 },
            { id: "c2", symbol: "G", beats: 4 },
            { id: "c3", symbol: "Am", beats: 4 },
            { id: "c4", symbol: "F", beats: 4 },
          ],
        },
      ],
    }

    const midiBytes = generateMidiFile(mockSong)

    expect(midiBytes).toBeInstanceOf(Uint8Array)
    expect(midiBytes.length).toBeGreaterThan(30)

    // Header Chunk magic string: "MThd" (0x4D 0x54 0x68 0x64)
    expect(midiBytes[0]).toBe(0x4d)
    expect(midiBytes[1]).toBe(0x54)
    expect(midiBytes[2]).toBe(0x68)
    expect(midiBytes[3]).toBe(0x64)

    // Track Chunk magic string: "MTrk" (0x4D 0x54 0x72 0x6B)
    const mtrkIndex = Array.from(midiBytes).findIndex(
      (b, idx) => b === 0x4d && midiBytes[idx + 1] === 0x54 && midiBytes[idx + 2] === 0x72 && midiBytes[idx + 3] === 0x6b,
    )
    expect(mtrkIndex).toBe(14) // Header chunk is 14 bytes
  })
})
