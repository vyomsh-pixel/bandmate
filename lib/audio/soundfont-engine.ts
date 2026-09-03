/**
 * BandMate — Real Sampled Soundfont Engine.
 *
 * Loads high-quality acoustic soundfont samples (Grand Piano, Rhodes, Guitars,
 * Strings, Bass) into Web Audio AudioBuffers with calibrated gain staging,
 * musical ADSR envelopes, and on-demand background decoding.
 */

export type InstrumentId =
  | "acoustic_grand_piano"
  | "bright_acoustic_piano"
  | "electric_piano_1"
  | "electric_piano_2"
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "string_ensemble_1"
  | "electric_bass_finger"
  | "synth_warm"
  | "synth_8bit"

export interface InstrumentInfo {
  id: InstrumentId
  name: string
  category: "Keyboards" | "Guitars" | "Strings" | "Bass" | "Synths"
  icon: string
  description: string
}

export const AVAILABLE_INSTRUMENTS: InstrumentInfo[] = [
  {
    id: "acoustic_grand_piano",
    name: "Concert Grand Piano",
    category: "Keyboards",
    icon: "🎹",
    description: "Authentic sampled acoustic grand piano",
  },
  {
    id: "bright_acoustic_piano",
    name: "Bright Pop Piano",
    category: "Keyboards",
    icon: "🎹",
    description: "Punchy, crisp Yamaha-style acoustic piano",
  },
  {
    id: "electric_piano_1",
    name: "Vintage Rhodes",
    category: "Keyboards",
    icon: "🎹",
    description: "Warm classic vintage electric piano with silky tines",
  },
  {
    id: "electric_piano_2",
    name: "FM Electric Piano (DX7)",
    category: "Keyboards",
    icon: "🎹",
    description: "Sparkling 80s digital electric piano",
  },
  {
    id: "acoustic_guitar_nylon",
    name: "Classical Nylon Guitar",
    category: "Guitars",
    icon: "🎸",
    description: "Warm, intimate Spanish classical guitar",
  },
  {
    id: "acoustic_guitar_steel",
    name: "Acoustic Steel Guitar",
    category: "Guitars",
    icon: "🎸",
    description: "Bright acoustic steel-string dreadnought",
  },
  {
    id: "electric_guitar_clean",
    name: "Clean Electric Guitar",
    category: "Guitars",
    icon: "🎸",
    description: "Mellow hollowbody jazz & neo-soul electric guitar",
  },
  {
    id: "string_ensemble_1",
    name: "Cinematic String Ensemble",
    category: "Strings",
    icon: "🎻",
    description: "Rich orchestral sustained violins & cellos with bow swell",
  },
  {
    id: "electric_bass_finger",
    name: "Electric Finger Bass",
    category: "Bass",
    icon: "🎸",
    description: "Deep, punchy fingerstyle bass in true low-octave register",
  },
  {
    id: "synth_warm",
    name: "Lush Analog Synth Pad",
    category: "Synths",
    icon: "🎛️",
    description: "Silky Juno/Prophet-style warm analog poly-synth",
  },
  {
    id: "synth_8bit",
    name: "Chiptune 8-Bit Synth",
    category: "Synths",
    icon: "👾",
    description: "Retro square-wave video game console chiptune",
  },
]

export interface InstrumentProfile {
  gainScale: number
  attack: number
  decay: number
  sustain: number
  release: number
  isSustained?: boolean
  octaveShift?: number
}

const INSTRUMENT_PROFILES: Record<InstrumentId, InstrumentProfile> = {
  acoustic_grand_piano: {
    gainScale: 0.52,
    attack: 0.005,
    decay: 1.6,
    sustain: 0.35,
    release: 0.15,
  },
  bright_acoustic_piano: {
    gainScale: 0.50,
    attack: 0.004,
    decay: 1.5,
    sustain: 0.35,
    release: 0.15,
  },
  electric_piano_1: {
    gainScale: 0.48,
    attack: 0.006,
    decay: 1.8,
    sustain: 0.45,
    release: 0.20,
  },
  electric_piano_2: {
    gainScale: 0.45,
    attack: 0.005,
    decay: 1.6,
    sustain: 0.40,
    release: 0.20,
  },
  acoustic_guitar_nylon: {
    gainScale: 0.44, // Calibrated sweet spot: zero distortion on nylon strings
    attack: 0.012,
    decay: 1.3,
    sustain: 0.38,
    release: 0.18,
  },
  acoustic_guitar_steel: {
    gainScale: 0.44,
    attack: 0.008,
    decay: 1.4,
    sustain: 0.38,
    release: 0.18,
  },
  electric_guitar_clean: {
    gainScale: 0.42,
    attack: 0.010,
    decay: 1.6,
    sustain: 0.50,
    release: 0.22,
  },
  string_ensemble_1: {
    gainScale: 0.35, // Balanced so full chords never clip
    attack: 0.110, // Lush orchestral bow swell
    decay: 0.4,
    sustain: 0.88, // Holds orchestral richness for entire chord duration
    release: 0.45, // Warm cinematic release
    isSustained: true,
  },
  electric_bass_finger: {
    gainScale: 0.55,
    attack: 0.008,
    decay: 1.4,
    sustain: 0.55,
    release: 0.20,
    octaveShift: -12, // Transpose to true deep electric bass register!
  },
  synth_warm: {
    gainScale: 0.18,
    attack: 0.025,
    decay: 0.35,
    sustain: 0.65,
    release: 0.35,
  },
  synth_8bit: {
    gainScale: 0.12,
    attack: 0.003,
    decay: 0.15,
    sustain: 0.55,
    release: 0.10,
  },
}

const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

export function midiToSampleName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12
  const oct = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[pc]}${oct}`
}

const SOUNDFONT_CDN_BASE = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM"

interface SoundfontCache {
  loading: boolean
  loaded: boolean
  buffers: Map<number, AudioBuffer>
}

class SoundfontEngine {
  private cache: Map<InstrumentId, SoundfontCache> = new Map()
  private rawDataCache: Map<InstrumentId, Record<string, string>> = new Map()
  private currentInstrument: InstrumentId = "acoustic_grand_piano"
  private listeners: Set<(instrument: InstrumentId, loaded: boolean) => void> = new Set()

  constructor() {
    for (const inst of AVAILABLE_INSTRUMENTS) {
      this.cache.set(inst.id, {
        loading: false,
        loaded: false,
        buffers: new Map(),
      })
    }
  }

  getCurrentInstrument(): InstrumentId {
    return this.currentInstrument
  }

  setInstrument(id: InstrumentId) {
    this.currentInstrument = id
  }

  subscribe(listener: (instrument: InstrumentId, loaded: boolean) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(instrument: InstrumentId, loaded: boolean) {
    for (const l of this.listeners) {
      l(instrument, loaded)
    }
  }

  isInstrumentLoaded(id: InstrumentId): boolean {
    if (id === "synth_warm" || id === "synth_8bit") return true
    return this.cache.get(id)?.loaded ?? false
  }

  /**
   * Load soundfont sample pack for the chosen instrument.
   * High performance: fetches soundfont and decodes the core playable register in small chunks.
   */
  async loadInstrument(id: InstrumentId, ctx: AudioContext): Promise<boolean> {
    if (id === "synth_warm" || id === "synth_8bit") {
      return true
    }

    const entry = this.cache.get(id)
    if (!entry) return false
    if (entry.loaded) return true
    if (entry.loading) return false

    entry.loading = true
    this.notify(id, false)

    try {
      let rawData = this.rawDataCache.get(id)
      if (!rawData) {
        const url = `${SOUNDFONT_CDN_BASE}/${id}-mp3.js`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching soundfont: ${url}`)
        const text = await res.text()

        // Extract soundfont JS object
        const MIDI: Record<string, unknown> = {}
        const fn = new Function("MIDI", `${text}; return MIDI;`)
        const result = fn(MIDI) as { Soundfont?: Record<string, Record<string, string>> }

        if (!result.Soundfont || !result.Soundfont[id]) {
          throw new Error(`Invalid soundfont data for ${id}`)
        }
        rawData = result.Soundfont[id]
        this.rawDataCache.set(id, rawData)
      }

      // Mark instrument usable immediately once sample table is ready
      entry.loaded = true
      entry.loading = false
      this.notify(id, true)

      // Decode the core chord register (MIDI 36 to 84 = C2 to C6) in small batches of 8
      // to avoid freezing the browser WebAudio thread
      const coreMidis: number[] = []
      for (let midi = 36; midi <= 84; midi++) {
        const noteName = midiToSampleName(midi)
        if (rawData[noteName]) coreMidis.push(midi)
      }

      const chunkSize = 8
      for (let i = 0; i < coreMidis.length; i += chunkSize) {
        const chunk = coreMidis.slice(i, i + chunkSize)
        await Promise.all(
          chunk.map((midi) => {
            const noteName = midiToSampleName(midi)
            const dataUri = rawData![noteName]
            return dataUri ? this.decodeAndCache(ctx, id, midi, dataUri) : Promise.resolve()
          })
        )
      }

      return true
    } catch (err) {
      console.warn(`[SoundfontEngine] Could not load ${id}, falling back to analog synth:`, err)
      entry.loading = false
      entry.loaded = false
      this.notify(id, false)
      return false
    }
  }

  private async decodeAndCache(
    ctx: AudioContext,
    instrumentId: InstrumentId,
    midi: number,
    dataUri: string,
  ): Promise<AudioBuffer | null> {
    try {
      const base64 = dataUri.split(",")[1]
      if (!base64) return null
      const binaryString = atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
      const entry = this.cache.get(instrumentId)
      if (entry) {
        entry.buffers.set(midi, audioBuffer)
      }
      return audioBuffer
    } catch (e) {
      return null
    }
  }

  /**
   * Play a sampled acoustic note at a specific time with instrument-specific calibration.
   * Returns true if sample played, false if caller should fallback to synthesis.
   */
  playSample(
    ctx: AudioContext,
    destination: AudioNode,
    midi: number,
    when: number,
    duration: number,
    velocity = 0.8,
    instrumentId: InstrumentId = this.currentInstrument,
  ): boolean {
    if (instrumentId === "synth_warm" || instrumentId === "synth_8bit") {
      return false
    }

    const entry = this.cache.get(instrumentId)
    if (!entry || !entry.loaded) {
      // Trigger background fetch if not yet started
      if (!entry?.loading) {
        this.loadInstrument(instrumentId, ctx).catch(() => {})
      }
      return false
    }

    const profile = INSTRUMENT_PROFILES[instrumentId] ?? INSTRUMENT_PROFILES.acoustic_grand_piano
    const targetMidi = profile.octaveShift ? midi + profile.octaveShift : midi

    // Lookup exact note or nearest sampled note
    let buffer = entry.buffers.get(targetMidi)
    let detuneCents = 0

    if (!buffer) {
      // On-demand decode if sample string exists
      const rawData = this.rawDataCache.get(instrumentId)
      if (rawData) {
        const noteName = midiToSampleName(targetMidi)
        const dataUri = rawData[noteName]
        if (dataUri) {
          this.decodeAndCache(ctx, instrumentId, targetMidi, dataUri).catch(() => {})
        }
      }

      // Find closest available sampled note in cache
      let closestMidi = -1
      let minDiff = 999
      for (const [m, buf] of entry.buffers.entries()) {
        const diff = Math.abs(m - targetMidi)
        if (diff < minDiff) {
          minDiff = diff
          closestMidi = m
          buffer = buf
        }
      }
      if (closestMidi !== -1 && minDiff <= 12) {
        detuneCents = (targetMidi - closestMidi) * 100
      }
    }

    if (!buffer) return false

    try {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      if (detuneCents !== 0) {
        source.detune.setValueAtTime(detuneCents, when)
      }

      const gain = ctx.createGain()
      // Calibrated peak level per instrument to avoid clipping through studio makeup gain
      const peak = Math.min(1.15, Math.max(0.08, velocity * profile.gainScale))

      if (profile.isSustained) {
        // Sustained instrument (e.g. String Ensemble)
        const end = when + duration
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(peak, when + profile.attack)
        gain.gain.setValueAtTime(peak * profile.sustain, Math.max(when + profile.attack, end - profile.release))
        gain.gain.exponentialRampToValueAtTime(0.0001, end + profile.release)

        source.connect(gain)
        gain.connect(destination)
        source.start(when)
        source.stop(end + profile.release + 0.05)
      } else {
        // Acoustic decaying instrument (Piano, Classical Nylon, Steel Guitar, Rhodes)
        const decayTime = Math.min(buffer.duration, duration + 0.8)
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(peak, when + profile.attack)
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * profile.sustain), when + decayTime)
        gain.gain.setValueAtTime(0.0001, when + decayTime + 0.05)

        source.connect(gain)
        gain.connect(destination)
        source.start(when)
        source.stop(when + decayTime + 0.1)
      }

      return true
    } catch (e) {
      return false
    }
  }
}

// Singleton soundfont engine
let soundfontEngineInstance: SoundfontEngine | null = null

export function getSoundfontEngine(): SoundfontEngine {
  if (!soundfontEngineInstance) {
    soundfontEngineInstance = new SoundfontEngine()
  }
  return soundfontEngineInstance
}
