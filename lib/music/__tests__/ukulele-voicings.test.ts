import { describe, it, expect } from "vitest"
import { parseChord } from "../chord-parser"
import { generateUkuleleVoicings } from "../ukulele-voicings"

describe("Ukulele Voicings Generator", () => {
  it("generates correct C major ukulele shape", () => {
    const chord = parseChord("C")
    const voicings = generateUkuleleVoicings(chord)
    expect(voicings.length).toBeGreaterThan(0)
    // C major should have [0, 0, 0, 3] as its primary shape
    const primary = voicings.find((v) => v.label === "C-Shape")
    expect(primary).toBeDefined()
    expect(primary?.frets).toEqual([0, 0, 0, 3])
  })

  it("generates correct Am ukulele shape", () => {
    const chord = parseChord("Am")
    const voicings = generateUkuleleVoicings(chord)
    expect(voicings.length).toBeGreaterThan(0)
    const primary = voicings.find((v) => v.label === "Am-Shape")
    expect(primary).toBeDefined()
    expect(primary?.frets).toEqual([2, 0, 0, 0])
  })

  it("generates correct F major ukulele shape", () => {
    const chord = parseChord("F")
    const voicings = generateUkuleleVoicings(chord)
    expect(voicings.length).toBeGreaterThan(0)
    const primary = voicings.find((v) => v.label === "F-Shape")
    expect(primary).toBeDefined()
    expect(primary?.frets).toEqual([2, 0, 1, 0])
  })

  it("generates G7 shape for G7", () => {
    const chord = parseChord("G7")
    const voicings = generateUkuleleVoicings(chord)
    expect(voicings.length).toBeGreaterThan(0)
    const g7 = voicings.find((v) => v.label === "G7-Shape")
    expect(g7).toBeDefined()
    expect(g7?.frets).toEqual([0, 2, 1, 2])
  })
})
