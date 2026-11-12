import { describe, it, expect } from "vitest"
import { parseChord } from "../chord-parser"
import {
  voiceChordInStyle,
  assignSATBVoices,
  analyzeVoiceLeadingStep,
  suggestSmoothInversion,
  voiceLeadingDistance,
} from "../voice-leading"
import { voiceChord } from "../chords"

describe("Voice Leading & SATB Polyphonic Engine", () => {
  it("generates correct notes for Drop-2, Shell, Open, and Close voicing styles", () => {
    const cmaj7 = parseChord("Cmaj7")
    expect(cmaj7.valid).toBe(true)

    const close = voiceChordInStyle(cmaj7, "close", { octave: 4 })
    expect(close.length).toBe(4) // C4, E4, G4, B4

    const drop2 = voiceChordInStyle(cmaj7, "drop2", { octave: 4 })
    expect(drop2.length).toBe(4)
    // In Drop-2, the second highest note (G4, midi 67) is dropped to G3 (midi 55)
    expect(drop2[0].midi).toBeLessThan(close[0].midi)

    const shell = voiceChordInStyle(cmaj7, "shell", { octave: 4 })
    expect(shell.length).toBeGreaterThanOrEqual(3) // Bass C + 3rd + 7th
    expect(shell[0].name).toBe("C")

    const open = voiceChordInStyle(cmaj7, "open", { octave: 4 })
    expect(open.length).toBe(4)
    expect(open[open.length - 1].midi).toBeGreaterThan(close[close.length - 1].midi)
  })

  it("assigns SATB voices reliably across note arrays", () => {
    const cmaj7 = parseChord("Cmaj7")
    const notes = voiceChordInStyle(cmaj7, "close", { octave: 4 })
    const satb = assignSATBVoices(notes)

    expect(satb).toHaveLength(4)
    expect(satb[0].voice).toBe("bass")
    expect(satb[1].voice).toBe("tenor")
    expect(satb[2].voice).toBe("alto")
    expect(satb[3].voice).toBe("soprano")
    expect(satb[0].note.midi).toBeLessThanOrEqual(satb[3].note.midi)
  })

  it("calculates voice leading step trajectories and smoothness scores", () => {
    const cmaj = parseChord("C")
    const gmaj = parseChord("G")

    const cVoicing = voiceChordInStyle(cmaj, "close", { octave: 4 })
    const gVoicing = voiceChordInStyle(gmaj, "close", { octave: 4 })

    const step = analyzeVoiceLeadingStep(cVoicing, gVoicing, "C", "G")
    expect(step.fromChord).toBe("C")
    expect(step.toChord).toBe("G")
    expect(step.voices).toHaveLength(4)
    expect(step.smoothnessScore).toBeGreaterThanOrEqual(0)
    expect(step.smoothnessScore).toBeLessThanOrEqual(100)
    expect(typeof step.totalDistance).toBe("number")
  })

  it("suggests smooth inversion between consecutive chords", () => {
    const cmaj = voiceChord(parseChord("C"))
    const fmaj = parseChord("F")
    const bestInv = suggestSmoothInversion(cmaj, fmaj)
    expect(typeof bestInv).toBe("number")
    expect([0, 1, 2]).toContain(bestInv)
  })
})
