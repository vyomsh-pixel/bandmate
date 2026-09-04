import { describe, expect, it } from "vitest"
import { parseSongFromDescription } from "../song-parser"

describe("parseSongFromDescription", () => {
  it("parses the Frank Sinatra 'Fly Me To The Moon' prompt correctly", () => {
    const prompt = `
"Fly Me To The Moon" — Frank Sinatra
Genre: Jazz Standard
Best to test: Circle of 5ths jazz progression, complex 7th chords (Am7, Dm7, G7, Cmaj7, Fmaj7, Bm7b5, E7), and Smooth Voice-Leading / Inversion Optimization.
Key: C Major / A Minor | BPM: 120 | Time Signature: 4/4
Section Breakdown
Main Section (8 Bars):
Am7 (4 beats) → Dm7 (4 beats) → G7 (4 beats) → Cmaj7 (4 beats)
Fmaj7 (4 beats) → Bm7b5 (4 beats) → E7 (4 beats) → Am7 (4 beats)
`

    const song = parseSongFromDescription(prompt)

    expect(song.title).toContain("Fly Me To The Moon")
    expect(song.keyTonic).toBe("C")
    expect(song.keyMode).toBe("major")
    expect(song.bpm).toBe(120)
    expect(song.beatsPerBar).toBe(4)
    expect(song.sections.length).toBeGreaterThanOrEqual(1)

    const mainSection = song.sections[0]
    expect(mainSection.name).toBe("Main Section")
    expect(mainSection.chords.length).toBe(8)
    expect(mainSection.chords.map((c) => c.symbol)).toEqual([
      "Am7",
      "Dm7",
      "G7",
      "Cmaj7",
      "Fmaj7",
      "Bm7b5",
      "E7",
      "Am7",
    ])
    expect(mainSection.chords.every((c) => c.beats === 4)).toBe(true)
  })
})
