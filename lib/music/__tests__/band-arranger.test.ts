import { describe, it, expect } from "vitest"
import {
  generateBandArrangement,
  isTrackAudible,
  getChordRootMidi,
  DEFAULT_BAND_TRACKS,
  type BandTrackConfig,
} from "../band-arranger"
import type { Song } from "../types"

const mockSong: Song = {
  id: "test-song",
  title: "Autumn Groove",
  keyTonic: "C",
  keyMode: "major",
  bpm: 120,
  beatsPerBar: 4,
  createdAt: 1000,
  updatedAt: 1000,
  sections: [
    {
      id: "sec-1",
      name: "Verse",
      chords: [
        { id: "c1", symbol: "C", beats: 4 },
        { id: "c2", symbol: "Am", beats: 4 },
        { id: "c3", symbol: "F", beats: 4 },
        { id: "c4", symbol: "G", beats: 4 },
      ],
    },
  ],
}

describe("band-arranger", () => {
  it("computes accurate chord root midis in bass register", () => {
    expect(getChordRootMidi("C")).toBe(36) // C2
    expect(getChordRootMidi("Am")).toBe(45) // A2
    expect(getChordRootMidi("F")).toBe(41) // F2
    expect(getChordRootMidi("G")).toBe(43) // G2
    expect(getChordRootMidi("C", "sub")).toBe(24) // C1 for LoFi/Sub
  })

  it("evaluates track audibility with solo and mute logic correctly", () => {
    const tracks: BandTrackConfig[] = [
      { id: "drums", name: "Drums", muted: false, solo: false, volume: 1, pan: 0 },
      { id: "bass", name: "Bass", muted: false, solo: false, volume: 1, pan: 0 },
      { id: "keys", name: "Keys", muted: false, solo: false, volume: 1, pan: 0 },
      { id: "guitar", name: "Guitar", muted: false, solo: false, volume: 1, pan: 0 },
    ]

    // Default: all audible
    expect(isTrackAudible(tracks[0], tracks)).toBe(true)
    expect(isTrackAudible(tracks[1], tracks)).toBe(true)

    // Muted track is silenced
    const tracksWithMute = tracks.map((t) => (t.id === "drums" ? { ...t, muted: true } : t))
    expect(isTrackAudible(tracksWithMute[0], tracksWithMute)).toBe(false)
    expect(isTrackAudible(tracksWithMute[1], tracksWithMute)).toBe(true)

    // Soloing Bass silences all non-soloed tracks
    const tracksWithSolo = tracks.map((t) => (t.id === "bass" ? { ...t, solo: true } : t))
    expect(isTrackAudible(tracksWithSolo[0], tracksWithSolo)).toBe(false) // Drums silenced
    expect(isTrackAudible(tracksWithSolo[1], tracksWithSolo)).toBe(true) // Bass audible
    expect(isTrackAudible(tracksWithSolo[2], tracksWithSolo)).toBe(false) // Keys silenced

    // Soloed but muted track is silenced
    const tracksSoloAndMuted = tracks.map((t) => (t.id === "bass" ? { ...t, solo: true, muted: true } : t))
    expect(isTrackAudible(tracksSoloAndMuted[1], tracksSoloAndMuted)).toBe(false)
  })

  it("generates multi-track arrangement for Rock groove", () => {
    const arrangement = generateBandArrangement(mockSong, "rock")
    expect(arrangement.totalBeats).toBe(16)
    expect(arrangement.drums.length).toBeGreaterThan(0)
    expect(arrangement.bass.length).toBeGreaterThan(0)
    expect(arrangement.keys.length).toBeGreaterThan(0)
    expect(arrangement.guitar.length).toBeGreaterThan(0)

    // Rock drums have kicks and snares
    const hasKick = arrangement.drums.some((d) => d.type === "kick")
    const hasSnare = arrangement.drums.some((d) => d.type === "snare")
    expect(hasKick).toBe(true)
    expect(hasSnare).toBe(true)
  })

  it("generates walking basslines with chromatic approaches for Jazz groove", () => {
    const arrangement = generateBandArrangement(mockSong, "jazz")
    expect(arrangement.style).toBe("jazz")
    expect(arrangement.bass.length).toBeGreaterThanOrEqual(16) // at least 1 note per beat

    // Beat 0 should be Root of C (36)
    expect(arrangement.bass[0].midis[0]).toBe(36)
  })

  it("generates 16th-note syncopated funk drums and comping for Funk groove", () => {
    const arrangement = generateBandArrangement(mockSong, "funk")
    expect(arrangement.style).toBe("funk")
    const hasGhostSnare = arrangement.drums.some((d) => d.type === "snare" && d.velocity < 0.5)
    expect(hasGhostSnare).toBe(true)
  })
})
