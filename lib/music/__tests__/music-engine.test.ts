import { describe, it, expect } from "vitest"
import { parseChord } from "../chord-parser"
import { chordShapeForCapo, suggestCapo } from "../capo"
import { detectKey, getRomanNumeral } from "../analysis"
import { makeKey, diatonicChords } from "../scales"
import { generateGuitarVoicings } from "../guitar-voicings"
import { voiceLeadingDistance, suggestSmoothInversion } from "../voice-leading"
import { voiceChord, playableVoicing } from "../chords"

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

  it("parses altered dominants and minor-major 7ths", () => {
    const hendrix = parseChord("E7#9")
    expect(hendrix.valid).toBe(true)
    expect(hendrix.quality).toBe("7#9")
    expect(hendrix.intervals).toEqual([0, 4, 7, 10, 15])

    const flat9 = parseChord("G7b9")
    expect(flat9.valid).toBe(true)
    expect(flat9.quality).toBe("7b9")
    expect(flat9.intervals).toEqual([0, 4, 7, 10, 13])

    const sharp5 = parseChord("C7#5")
    expect(sharp5.valid).toBe(true)
    expect(sharp5.quality).toBe("7#5")
    expect(sharp5.intervals).toEqual([0, 4, 8, 10])

    const jamesBond = parseChord("Am(maj7)")
    expect(jamesBond.valid).toBe(true)
    expect(jamesBond.quality).toBe("mM7")
    expect(jamesBond.intervals).toEqual([0, 3, 7, 11])
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

  it("optimizes a full chord progression with minimal voice-leading leaps", () => {
    const symbols = ["C", "F", "G", "C"]
    let prevVoicing = playableVoicing(parseChord(symbols[0]), { octave: 4, inversion: 0 })
    const inversions: number[] = [0]

    for (let i = 1; i < symbols.length; i++) {
      const parsed = parseChord(symbols[i])
      const bestInv = suggestSmoothInversion(prevVoicing, parsed, "sharp")
      inversions.push(bestInv)
      prevVoicing = playableVoicing(parsed, { octave: 4, inversion: bestInv })
    }

    expect(inversions.length).toBe(4)
    // F should be inverted (typically 2nd inversion: C-F-A) to keep common tone C near C major
    expect(inversions[1]).toBe(2)
  })
})

describe("Music Engine: Scales & Slash Chords", () => {
  it("includes harmonic minor major dominant (V and V7) in minor keys", () => {
    const aMinor = makeKey("A", "minor")
    const chords = diatonicChords(aMinor)

    // Should include natural minor v (Em)
    expect(chords.some((c) => c.roman === "v" && c.symbol === "Em")).toBe(true)

    // Should also include harmonic minor V (E) and V7 (E7)
    expect(chords.some((c) => c.roman === "V" && c.symbol === "E")).toBe(true)
    expect(chords.some((c) => c.roman === "V7" && c.symbol === "E7")).toBe(true)
  })

  it("voices slash chord bass note in the lower bass register", () => {
    const gOverB = parseChord("G/B")
    expect(gOverB.valid).toBe(true)
    expect(gOverB.bassName).toBe("B")

    const notes = playableVoicing(gOverB, { octave: 4, accidental: "sharp" })
    expect(notes.length).toBeGreaterThanOrEqual(4)

    // First note should be the bass note B in octave 3
    const bassNote = notes[0]
    expect(bassNote.name).toBe("B")
    expect(bassNote.octave).toBe(3)
    expect(bassNote.midi).toBe(59) // B3 is 59 (48 + 11)
  })
})

