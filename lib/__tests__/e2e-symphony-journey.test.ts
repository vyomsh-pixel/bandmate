import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  saveLocalAccount,
  verifyLocalAccount,
  type User,
} from "../auth/auth-context"
import {
  saveUserSongs,
  loadUserSongs,
  saveUserCurrentSongId,
  loadUserCurrentSongId,
  migrateGuestSongsToUser,
} from "../storage/cloud-sync"
import { parseSongFromDescription } from "../music/song-parser"
import { parseChord } from "../music/chord-parser"
import { playableVoicing, getVoicingMidis, computeLeftHandMidis } from "../music/chords"
import { makeKey } from "../music/scales"
import { getHarmonicFunction, detectKey } from "../music/analysis"
import { suggestSmoothInversion } from "../music/voice-leading"
import { suggestNextChords } from "../music/chord-suggester"
import { transposeProgression } from "../music/transpose"
import { suggestCapo, chordShapeForCapo } from "../music/capo"
import { generateGuitarVoicings } from "../music/guitar-voicings"
import { generateMidiFile } from "../export/midi-export"
import { generateLeadSheetText } from "../export/lead-sheet"
import { getAudioEngine, type RhythmPattern } from "../audio/audio-engine"
import { getSoundfontEngine } from "../audio/soundfont-engine"
import type { Song } from "../music/types"

function createMockLocalStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

function createMockAudioContext() {
  const stats = {
    convolverCreated: 0,
    pannerValues: [] as number[],
    bufferSourcesCreated: 0,
    oscillatorsCreated: 0,
    disconnectedNodes: 0,
    activeSources: [] as { triggerEnded: () => void }[],
  }

  const makeMockParam = (initial = 0) => ({
    value: initial,
    setValueAtTime: vi.fn((val: number) => {
      return val
    }),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  })

  const makeNode = (name: string) => ({
    name,
    connect: vi.fn(),
    disconnect: vi.fn(() => {
      stats.disconnectedNodes++
    }),
  })

  const ctx = {
    state: "running",
    currentTime: 1.0,
    sampleRate: 44100,
    destination: makeNode("destination"),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => ({
      ...makeNode("gain"),
      gain: makeMockParam(1),
    })),
    createDynamicsCompressor: vi.fn(() => ({
      ...makeNode("compressor"),
      threshold: makeMockParam(-12),
      knee: makeMockParam(10),
      ratio: makeMockParam(3.5),
      attack: makeMockParam(0.003),
      release: makeMockParam(0.12),
    })),
    createBiquadFilter: vi.fn(() => ({
      ...makeNode("filter"),
      type: "lowpass",
      frequency: makeMockParam(1200),
      Q: makeMockParam(1),
    })),
    createConvolver: vi.fn(() => {
      stats.convolverCreated++
      return {
        ...makeNode("convolver"),
        buffer: null as AudioBuffer | null,
      }
    }),
    createStereoPanner: vi.fn(() => {
      const panParam = {
        value: 0,
        setValueAtTime: vi.fn((v: number) => {
          stats.pannerValues.push(v)
        }),
      }
      return {
        ...makeNode("panner"),
        pan: panParam,
      }
    }),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
      const chData = Array.from({ length: channels }, () => new Float32Array(length))
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (c: number) => chData[c],
      } as unknown as AudioBuffer
    }),
    createBufferSource: vi.fn(() => {
      stats.bufferSourcesCreated++
      const src: any = {
        ...makeNode("bufferSource"),
        buffer: null,
        detune: makeMockParam(0),
        onended: null as (() => void) | null,
        start: vi.fn(),
        stop: vi.fn(),
      }
      stats.activeSources.push({
        triggerEnded: () => src.onended?.(),
      })
      return src
    }),
    createOscillator: vi.fn(() => {
      stats.oscillatorsCreated++
      const osc: any = {
        ...makeNode("oscillator"),
        type: "triangle",
        frequency: makeMockParam(440),
        detune: makeMockParam(0),
        onended: null as (() => void) | null,
        start: vi.fn(),
        stop: vi.fn(),
      }
      stats.activeSources.push({
        triggerEnded: () => osc.onended?.(),
      })
      return osc
    }),
  }

  return { ctx: ctx as unknown as AudioContext, stats }
}

describe("BandMate Full E2E Journey: From Login to Composing & Playing a Simple Symphony", () => {
  beforeEach(() => {
    const mockStorage = createMockLocalStorage()
    // @ts-ignore
    globalThis.window = {
      localStorage: mockStorage,
      addEventListener: vi.fn(),
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    } as any
    // @ts-ignore
    globalThis.localStorage = mockStorage
    // @ts-ignore
    globalThis.requestAnimationFrame = vi.fn(() => 1)
    // @ts-ignore
    globalThis.cancelAnimationFrame = vi.fn()
  })

  it("completes the full lifecycle: guest sketch -> signup/login -> 4-movement symphony composition -> orchestration -> guitar/capo lab -> studio audio playback -> MIDI/LeadSheet/JSON export", async () => {
    // =========================================================================
    // 1. GUEST SKETCH -> ACCOUNT REGISTRATION -> LOGIN & MIGRATION
    // =========================================================================
    const guestSketch: Song = {
      id: "guest-sketch-1",
      title: "Symphony Sketch (Overture)",
      keyTonic: "C",
      keyMode: "minor",
      bpm: 108,
      beatsPerBar: 4,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [
        {
          id: "sec-sketch",
          name: "Motif",
          chords: [
            { id: "k1", symbol: "Cm", beats: 4 },
            { id: "k2", symbol: "G7", beats: 4 },
          ],
        },
      ],
    }
    saveUserSongs("guest-user", [guestSketch])
    expect(loadUserSongs("guest-user")).toHaveLength(1)

    // Register a new studio composer account
    const composerUser: User = {
      uid: "usr_symphony_composer",
      email: "beethoven@bandmate.studio",
      displayName: "L. van Beethoven",
      isGuest: false,
      createdAt: Date.now(),
      consentAcceptedAt: Date.now(),
    }
    await saveLocalAccount(composerUser.email, "NinthSymphony#1824", composerUser)

    // Verify login rejects invalid credentials and succeeds with valid password
    expect(await verifyLocalAccount(composerUser.email, "WrongPass")).toBeNull()
    const loggedIn = await verifyLocalAccount(composerUser.email, "NinthSymphony#1824")
    expect(loggedIn?.uid).toBe("usr_symphony_composer")
    expect(loggedIn?.displayName).toBe("L. van Beethoven")

    // Migrate guest sketch into authenticated user's studio library
    const migrated = migrateGuestSongsToUser(composerUser.uid)
    expect(migrated).toHaveLength(1)
    expect(migrated[0].title).toBe("Symphony Sketch (Overture)")

    // =========================================================================
    // 2. COMPOSE A 4-MOVEMENT "SIMPLE SYMPHONY" & AUTO-DETECT KEY
    // =========================================================================
    const symphonyLeadSheet = `
"Pocket Symphony No. 1 in C Minor"
BPM: 112 | Time Signature: 4/4

[Movement I: Allegro con brio]
Cm (4 beats) -> Fm7 (4 beats) -> G7/B (4 beats) -> Cm (4 beats)
Abmaj7 (4 beats) -> Dm7b5 (4 beats) -> G7 (4 beats) -> Cm (4 beats)

[Movement II: Adagio Cantabile]
Eb (4 beats) -> Bb/D (4 beats) -> Cm7 (4 beats) -> Abmaj7 (4 beats)
Fm7 (4 beats) -> Bb7 (4 beats) -> Ebmaj7 (8 beats)

[Movement III: Minuetto & Trio]
Cm (3 beats) -> G7 (3 beats) -> Cm (3 beats) -> Fm (3 beats)
Dm7b5 (3 beats) -> G7 (3 beats) -> Cm (6 beats)

[Movement IV: Finale (Triumphant Picardy)]
Cm (4 beats) -> Abmaj7 (4 beats) -> Fm7 (4 beats) -> G7 (4 beats)
C (4 beats) -> Fmaj7 (4 beats) -> G7 (4 beats) -> Cmaj7 (8 beats)
`
    // Note: No explicit "Key:" line is given in symphonyLeadSheet — parser must auto-detect C minor / Eb major!
    const parsedSymphony = parseSongFromDescription(symphonyLeadSheet)
    expect(parsedSymphony.valid).toBe(true)
    expect(parsedSymphony.title).toContain("Pocket Symphony No. 1 in C Minor")
    expect(parsedSymphony.bpm).toBe(112)
    expect(parsedSymphony.sections).toHaveLength(4)
    expect(parsedSymphony.chordsExtracted).toBe(30)

    // Verify detectKey identifies the C minor / Eb major tonal center
    const detected = detectKey(parsedSymphony.sections[0].chords.map((c) => c.symbol))
    expect(detected).not.toBeNull()
    expect(detected?.tonic).toBe("C")
    expect(detected?.mode).toBe("minor")

    // Verify Harmonic Function analysis on Movement I (Tonic, Subdominant, Dominant)
    const cMinorKey = makeKey("C", "minor")
    const fnCm = getHarmonicFunction("Cm", cMinorKey)
    const fnFm7 = getHarmonicFunction("Fm7", cMinorKey)
    const fnG7 = getHarmonicFunction("G7", cMinorKey)
    expect(fnCm.role).toBe("tonic")
    expect(fnFm7.role).toBe("subdominant")
    expect(fnG7.role).toBe("dominant")

    // Verify AI/Theory Next-Chord Suggester offers musical resolutions after G7 in C minor
    const suggestionsAfterG7 = suggestNextChords(["Cm", "Fm7", "G7"], cMinorKey)
    expect(suggestionsAfterG7.length).toBeGreaterThan(0)
    expect(suggestionsAfterG7.some((s) => s.symbol.startsWith("C"))).toBe(true)

    // =========================================================================
    // 3. ORCHESTRATION: SMOOTH VOICE LEADING & TWO-HANDED CELLO/BASS VOICING
    // =========================================================================
    const movement1 = parsedSymphony.sections[0]
    let prevNotes = playableVoicing(parseChord(movement1.chords[0].symbol), { octave: 4, accidental: "flat", inversion: 0 })

    const voicedMovement1 = movement1.chords.map((entry, idx) => {
      const parsed = parseChord(entry.symbol)
      expect(parsed.valid).toBe(true)
      const inv = idx === 0 ? 0 : suggestSmoothInversion(prevNotes, parsed, "flat")
      prevNotes = playableVoicing(parsed, { octave: 4, accidental: "flat", inversion: inv })
      return { ...entry, inversion: inv }
    })

    // Check slash chord G7/B (index 2 in Movement I) places B in the bass below the chord
    const g7OverBParsed = parseChord("G7/B")
    const g7OverBVoicing = playableVoicing(g7OverBParsed, { octave: 4, accidental: "flat", inversion: 0 })
    expect(g7OverBVoicing[0].name).toBe("B")
    expect(g7OverBVoicing[0].midi).toBeLessThan(g7OverBVoicing[1].midi)

    // Verify Two-Handed Orchestral Mode adds lower C2-C3 (MIDI 36-48) contrabass/cello notes
    const singleHandMidis = getVoicingMidis(parseChord("Cm"), { octave: 4, accidental: "flat" }, false)
    const twoHandMidis = getVoicingMidis(parseChord("Cm"), { octave: 4, accidental: "flat" }, true)
    expect(twoHandMidis.length).toBeGreaterThan(singleHandMidis.length)
    expect(twoHandMidis[0]).toBeGreaterThanOrEqual(36)
    expect(twoHandMidis[0]).toBeLessThanOrEqual(48)

    const lhCheck = computeLeftHandMidis(singleHandMidis, singleHandMidis[0], null)
    expect(lhCheck.lhBassMidi).toBe(36) // C2 in bass!

    // Verify Key Transposition works cleanly across a movement
    const transposedUp2 = transposeProgression(movement1.chords, 2, "D", "minor")
    expect(transposedUp2[0].symbol).toBe("Dm")
    expect(transposedUp2[1].symbol).toBe("Gm7")

    // =========================================================================
    // 4. INSTRUMENT LAB: GUITAR VOICINGS & SMART AUTO-CAPO
    // =========================================================================
    const capoRecs = suggestCapo(movement1.chords.map((c) => c.symbol), cMinorKey)
    expect(capoRecs.length).toBeGreaterThan(0)
    // At Capo 3, Cm becomes an open Am shape!
    expect(chordShapeForCapo("Cm", 3, "flat")).toBe("Am")
    const amShapes = generateGuitarVoicings(parseChord("Am"))
    expect(amShapes.length).toBeGreaterThan(0)
    expect(amShapes[0].frets).toHaveLength(6)

    // =========================================================================
    // 5. STUDIO AUDIO ENGINE: REVERB, STEREO STAGE, STRUMMING & 6 GROOVES
    // =========================================================================
    const { ctx, stats } = createMockAudioContext()
    // @ts-ignore
    globalThis.window.AudioContext = function () {
      return ctx
    }

    const audio = getAudioEngine()
    audio.dispose() // reset any prior context
    await audio.ensureContext()

    // Studio Room Convolution Reverb must be initialized
    expect(stats.convolverCreated).toBe(1)

    // Inject a decoded sample buffer into SoundfontEngine for string_ensemble_1 so we test real sample playback
    const sf = getSoundfontEngine()
    await audio.setInstrument("string_ensemble_1")
    const dummyBuffer = ctx.createBuffer(2, 44100 * 2, 44100)
    ;(sf as any).cache.set("string_ensemble_1", {
      loaded: true,
      loading: false,
      buffers: new Map([[60, dummyBuffer], [48, dummyBuffer], [72, dummyBuffer]]),
    })

    // Play a 2-handed symphony C minor chord with down-bow/down-strum and up-strum
    audio.playChord(twoHandMidis, { duration: 1.5, velocity: 0.9, strumDirection: "down" })
    audio.playChord(twoHandMidis, { duration: 1.5, velocity: 0.85, strumDirection: "up" })

    expect(stats.bufferSourcesCreated).toBe(twoHandMidis.length * 2)
    // Verify pitch-based stereo panning was applied (negative pan for C2=36, positive pan for G4=67)
    expect(stats.pannerValues.some((p) => p < 0)).toBe(true)
    expect(stats.pannerValues.some((p) => p > 0)).toBe(true)

    // Trigger onended on all active sources and verify WebAudio nodes disconnect (8GB RAM leak protection)
    const beforeDisconnects = stats.disconnectedNodes
    stats.activeSources.forEach((s) => s.triggerEnded())
    expect(stats.disconnectedNodes).toBeGreaterThan(beforeDisconnects)

    // Test Transport Scheduler across all 6 rhythm grooves (including Strudel-inspired acoustic_strum & neosoul)
    const grooves: RhythmPattern[] = ["sustain", "pulse", "acoustic_strum", "pop", "arpeggio", "neosoul"]
    for (const groove of grooves) {
      const beatEvents: number[] = []
      await audio.start(
        {
          bpm: 120,
          beatsPerBar: 4,
          chords: voicedMovement1.slice(0, 2).map((c) => ({
            midis: getVoicingMidis(parseChord(c.symbol), { octave: 4, accidental: "flat", inversion: c.inversion }, true),
            beats: c.beats,
          })),
          loop: false,
          metronome: true,
          rhythm: groove,
        },
        (info) => beatEvents.push(info.beatInBar),
      )
      expect(audio.isRunning()).toBe(true)
      // Advance mock AudioContext clock through count-in and first bar
      for (let step = 0; step < 6; step++) {
        ;(ctx as any).currentTime += 0.5
        ;(audio as any).scheduler()
      }
      audio.stop()
      expect(audio.isRunning()).toBe(false)
    }

    // =========================================================================
    // 6. SAVE SYMPHONY TO USER ACCOUNT & VERIFY MIDI / LEAD SHEET / JSON EXPORT
    // =========================================================================
    const fullSymphonySong: Song = {
      id: "symphony-c-minor-op1",
      title: parsedSymphony.title,
      keyTonic: "C",
      keyMode: "minor",
      bpm: parsedSymphony.bpm,
      beatsPerBar: parsedSymphony.beatsPerBar,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [
        { ...movement1, chords: voicedMovement1 },
        ...parsedSymphony.sections.slice(1),
      ],
    }

    saveUserSongs(composerUser.uid, [fullSymphonySong, ...migrated])
    saveUserCurrentSongId(composerUser.uid, fullSymphonySong.id)

    const savedLibrary = loadUserSongs(composerUser.uid)
    expect(savedLibrary).toHaveLength(2)
    expect(loadUserCurrentSongId(composerUser.uid)).toBe("symphony-c-minor-op1")

    // Export 1: Standard MIDI File (.mid)
    const midiBytes = generateMidiFile(fullSymphonySong)
    expect(midiBytes.slice(0, 4)).toEqual(new Uint8Array([0x4d, 0x54, 0x68, 0x64])) // "MThd"
    expect(midiBytes.length).toBeGreaterThan(200) // Contains all 29 chords across 4 movements

    // Export 2: Printable Lead Sheet (.txt)
    const leadSheet = generateLeadSheetText(fullSymphonySong)
    expect(leadSheet).toContain("POCKET SYMPHONY NO. 1 IN C MINOR")
    expect(leadSheet).toContain("[ MOVEMENT I: ALLEGRO CON BRIO ]")
    expect(leadSheet).toContain("[ MOVEMENT II: ADAGIO CANTABILE ]")
    expect(leadSheet).toContain("[ MOVEMENT III: MINUETTO & TRIO ]")
    expect(leadSheet).toContain("[ MOVEMENT IV: FINALE (TRIUMPHANT PICARDY) ]")

    // Export 3: JSON Project Backup (.bandmate.json) & Round-Trip Re-Import
    const jsonExport = JSON.stringify(fullSymphonySong, null, 2)
    const reimported = parseSongFromDescription(jsonExport)
    expect(reimported.valid).toBe(true)
    expect(reimported.title).toBe(fullSymphonySong.title)
    expect(reimported.sections).toHaveLength(4)
    expect(reimported.chordsExtracted).toBe(30)
    expect(reimported.sections[0].chords[1].inversion).toBe(voicedMovement1[1].inversion)
  }, 15000)
})
