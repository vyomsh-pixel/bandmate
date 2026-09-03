import { describe, it, expect } from "vitest"
import { suggestNextChords } from "../chord-suggester"
import { makeKey } from "../scales"

describe("AI Chord Suggester Engine", () => {
  const keyC = makeKey("C", "major")

  it("provides starting recommendations when progression is empty", () => {
    const suggestions = suggestNextChords([], keyC)
    expect(suggestions.length).toBe(3)
    expect(suggestions[0].symbol).toBe("C")
  })

  it("recommends resolution to Tonic when last chord is Dominant (G)", () => {
    const suggestions = suggestNextChords(["C", "F", "G"], keyC)
    expect(suggestions.length).toBe(3)
    const symbols = suggestions.map((s) => s.symbol)
    expect(symbols).toContain("C")
  })

  it("recommends Dominant motion when last chord is Subdominant (F)", () => {
    const suggestions = suggestNextChords(["C", "F"], keyC)
    expect(suggestions.length).toBe(3)
    const symbols = suggestions.map((s) => s.symbol)
    expect(symbols).toContain("G")
  })
})
