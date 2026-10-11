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
    expect(symbols).toContain("G7")
  })

  it("uses Submediant (VI) label and harmonic minor V7 (E7) in A minor", () => {
    const keyAm = makeKey("A", "minor")
    const initial = suggestNextChords([], keyAm)
    const viSuggestion = initial.find((s) => s.roman === "VI")
    expect(viSuggestion?.label).toBe("Submediant (VI)")
    expect(viSuggestion?.symbol).toBe("F")

    const afterSubdom = suggestNextChords(["Am", "Dm"], keyAm)
    const dom7 = afterSubdom.find((s) => s.label === "Dominant 7th")
    expect(dom7?.symbol).toBe("E7")
    expect(dom7?.roman).toBe("V7")
  })
})
