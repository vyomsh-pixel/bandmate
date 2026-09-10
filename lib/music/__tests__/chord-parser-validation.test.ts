import { describe, expect, it } from "vitest"
import { parseChord } from "../chord-parser"

describe("Chord Parser Strict Validation", () => {
  it("parses valid chord symbols correctly", () => {
    expect(parseChord("C").valid).toBe(true)
    expect(parseChord("F#m7").valid).toBe(true)
    expect(parseChord("G/B").valid).toBe(true)
    expect(parseChord("Bbmaj7").valid).toBe(true)
    expect(parseChord("Dsus4").valid).toBe(true)
    expect(parseChord("C7#9").valid).toBe(true)
  })

  it("flags invalid trailing text and invalid slash notes as invalid", () => {
    expect(parseChord("Cmaj7xyz").valid).toBe(false)
    expect(parseChord("G/invalid").valid).toBe(false)
    expect(parseChord("F#m7???").valid).toBe(false)
    expect(parseChord("Xyz").valid).toBe(false)
    expect(parseChord("a").valid).toBe(false)
  })
})
