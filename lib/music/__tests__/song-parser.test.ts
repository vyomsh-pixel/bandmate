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

  it("parses multi-section song descriptions into separate Verse, Chorus, Bridge, and Outro sections", () => {
    const multiSectionPrompt = `
"Hotel California" — Eagles
Key: B Minor | BPM: 74
Verse 1
Bm F# A E G D Em F#

Chorus:
G D F# Bm G D Em F#

Bridge
[Bridge]
Em B7 Em B7 C G Am B7

Outro:
Bm F# A E
`
    const song = parseSongFromDescription(multiSectionPrompt)
    expect(song.title).toContain("Hotel California")
    expect(song.keyTonic).toBe("B")
    expect(song.keyMode).toBe("minor")
    expect(song.bpm).toBe(74)

    expect(song.sections.length).toBe(4)
    expect(song.sections[0].name).toBe("Verse 1")
    expect(song.sections[0].chords.map((c) => c.symbol)).toEqual(["Bm", "F#", "A", "E", "G", "D", "Em", "F#"])

    expect(song.sections[1].name).toBe("Chorus")
    expect(song.sections[1].chords.map((c) => c.symbol)).toEqual(["G", "D", "F#", "Bm", "G", "D", "Em", "F#"])

    expect(song.sections[2].name).toBe("Bridge")
    expect(song.sections[2].chords.map((c) => c.symbol)).toEqual(["Em", "B7", "Em", "B7", "C", "G", "Am", "B7"])

    expect(song.sections[3].name).toBe("Outro")
    expect(song.sections[3].chords.map((c) => c.symbol)).toEqual(["Bm", "F#", "A", "E"])
  })

  it("returns valid: false and chordsExtracted: 0 when text contains no chords", () => {
    const unparseableText = "This is a random sentence with no musical chords whatsoever."
    const song = parseSongFromDescription(unparseableText)
    expect(song.valid).toBe(false)
    expect(song.chordsExtracted).toBe(0)
    expect(song.sections).toEqual([])
  })
})
