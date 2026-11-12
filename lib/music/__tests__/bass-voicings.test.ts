import { describe, it, expect } from "vitest"
import { parseChord } from "../chord-parser"
import { generateBassVoicings } from "../bass-voicings"

describe("Bass Voicings Generator", () => {
  it("generates root and root-fifth patterns for C chord", () => {
    const chord = parseChord("C")
    const voicings = generateBassVoicings(chord)
    expect(voicings.length).toBeGreaterThan(0)
    // C on A string is fret 3
    const aRoot = voicings.find((v) => v.label === "Root (A-string)")
    expect(aRoot).toBeDefined()
    expect(aRoot?.frets[1]).toBe(3)
  })

  it("generates E-string root for G chord", () => {
    const chord = parseChord("G")
    const voicings = generateBassVoicings(chord)
    // G on E string is fret 3
    const eRoot = voicings.find((v) => v.label === "Root (E-string)")
    expect(eRoot).toBeDefined()
    expect(eRoot?.frets[0]).toBe(3)
  })
})
