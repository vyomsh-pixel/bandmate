import { describe, expect, it } from "vitest"
import { getAudioEngine } from "../audio-engine"
import { parseSoundfontScript } from "../soundfont-engine"

describe("AudioEngine Initialization and Config", () => {
  it("returns audio engine singleton", () => {
    const engine1 = getAudioEngine()
    const engine2 = getAudioEngine()
    expect(engine1).toBe(engine2)
  })

  it("manages transport running state correctly", () => {
    const engine = getAudioEngine()
    expect(engine.isRunning()).toBe(false)
  })

  it("safely extracts base64 audio samples from soundfont scripts without executing code", () => {
    const mockScript = `
      if (typeof MIDI === 'undefined') var MIDI = {};
      if (typeof MIDI.Soundfont === 'undefined') MIDI.Soundfont = {};
      MIDI.Soundfont.acoustic_grand_piano = {
        "C4": "data:audio/mp3;base64,AAAA",
        "Eb4": "data:audio/mp3;base64,BBBB",
        "C-1": "data:audio/mp3;base64,CCCC"
      };
    `
    const extracted = parseSoundfontScript(mockScript)
    expect(extracted).toEqual({
      C4: "data:audio/mp3;base64,AAAA",
      Eb4: "data:audio/mp3;base64,BBBB",
      "C-1": "data:audio/mp3;base64,CCCC",
    })
  })
})
