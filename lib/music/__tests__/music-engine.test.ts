import { describe, it, expect } from "vitest"
import { parseChord } from "../chord-parser"
import { chordShapeForCapo, suggestCapo } from "../capo"
import { detectKey, getRomanNumeral } from "../analysis"
import { makeKey } from "../scales"
import { generateGuitarVoicings } from "../guitar-voicings"
import { voiceLeadingDistance, suggestSmoothInversion } from "../voice-leading"
import { voiceChord } from "../chords"

describe("Music Engine: Chord Parser", () => {
  it("parses 11th and 13th chords", () => {
    const c13 = parseChord("C13")
    expect(c13.valid).toBe(true)
    expect(c13.quality).toBe("13")
    expect(c13.intervals).toEqual([0, 4, 7, 10, 14, 17, 21])

    const fmin11 = parseChord("Fm11")
    expect(fmin11.valid).toBe(true)
    expect(fmin11.quality).toBe("m11")
    expect(fmin11.intervals).toEqual([0, 3, 7, 10, 14, 17])
  })

  it("rejects invalid chord suffixes with trailing characters", () => {
    const invalid1 = parseChord("Cmaj7xyz")
    expect(invalid1.valid).toBe(false)

    const invalid2 = parseChord("Ginvalid")
    expect(invalid2.valid).toBe(false)

    const valid = parseChord("Cmaj7")
    expect(valid.valid).toBe(true)
  })
})

describe("Music Engine: Capo", () => {
  it("calculates chord shapes correctly for a given capo", () => {
    // If capo is on fret 5, playing a C shape sounds like F
    expect(chordShapeForCapo("F", 5, "sharp")).toBe("C")
    expect(chordShapeForCapo("Bb", 3, "flat")).toBe("G")
  })

  it("suggests the best capo", () => {
    const chords = ["F", "Bb", "C", "Dm"] // Key of F
    const suggestions = suggestCapo(chords)
    
    // Capo 3 or Capo 5 allow playing standard open shapes (D, G, A or C, F, G, Am)
    expect([3, 5]).toContain(suggestions[0].fret) 
  })
})

describe("Music Engine: Analysis", () => {
  it("determines diatonic roman numerals", () => {
    const key = makeKey("C", "major")
    expect(getRomanNumeral("Cmaj7", key)).toBe("Imaj7")
    expect(getRomanNumeral("Dm7", key)).toBe("ii7")
    expect(getRomanNumeral("G7", key)).toBe("V7")
    expect(getRomanNumeral("Bdim", key)).toBe("vii°")
    expect(getRomanNumeral("Bdim7", key)).toBe("vii°7")
  })

  it("determines borrowed / chromatic roman numerals", () => {
    const key = makeKey("C", "major")
    expect(getRomanNumeral("Bb", key)).toBe("bVII")
    expect(getRomanNumeral("Ab", key)).toBe("bVI")
    expect(getRomanNumeral("Eb", key)).toBe("bIII")
  })

  it("detects keys from chord sequences", () => {
    const key = detectKey(["Am", "F", "C", "G"])
    expect(key).not.toBeNull()
    expect(key?.tonic).toBe("A")
    expect(key?.mode).toBe("minor")

    const majorKey = detectKey(["C", "F", "G"])
    expect(majorKey).not.toBeNull()
    expect(majorKey?.tonic).toBe("C")
    expect(majorKey?.mode).toBe("major")
  })
})

describe("Music Engine: Guitar Voicings", () => {
  it("generates valid playable shapes for C major", () => {
    const cMajor = parseChord("C")
    const voicings = generateGuitarVoicings(cMajor)
    expect(voicings.length).toBeGreaterThan(0)
    expect(voicings.some(v => v.label.includes("C-Shape"))).toBe(true)
  })

  it("generates barre shapes for B without negative frets", () => {
    const bMajor = parseChord("B")
    const voicings = generateGuitarVoicings(bMajor)
    expect(voicings.length).toBeGreaterThan(0)
    for (const v of voicings) {
      for (const fret of v.frets) {
        if (typeof fret === "number") {
          expect(fret).toBeGreaterThanOrEqual(0)
          expect(fret).toBeLessThanOrEqual(15)
        }
      }
    }
  })
})

describe("Music Engine: Voice Leading", () => {
  it("calculates voice leading distance", () => {
    const cMaj = voiceChord(parseChord("C"))
    const gMaj = voiceChord(parseChord("G"))
    const dist = voiceLeadingDistance(cMaj, gMaj)
    expect(dist).toBeGreaterThan(0)
    expect(dist).toBeLessThan(50)
  })

  it("suggests smooth inversion", () => {
    const cMaj = voiceChord(parseChord("C"))
    const fMaj = parseChord("F")
    const bestInv = suggestSmoothInversion(cMaj, fMaj)
    expect(typeof bestInv).toBe("number")
  })
})
