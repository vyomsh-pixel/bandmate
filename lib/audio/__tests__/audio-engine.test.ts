import { describe, expect, it } from "vitest"
import { getAudioEngine } from "../audio-engine"

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
})
