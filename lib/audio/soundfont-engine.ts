/**
 * BandMate — Real Sampled Soundfont Engine.
 *
 * Loads high-quality acoustic soundfont samples (Grand Piano, Electric Piano,
 * Acoustic Guitar, Strings, Bass) into Web Audio AudioBuffers.
 * Replaces synthetic bleeps with authentic acoustic instrument recordings.
 */

export type InstrumentId =
  | "acoustic_grand_piano"
  | "electric_piano_1"
  | "acoustic_guitar_steel"
  | "acoustic_guitar_nylon"
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
    description: "Authentic sampled acoustic grand piano (Real)",
  },
  {
    id: "electric_piano_1",
    name: "Electric Piano (Rhodes)",
    category: "Keyboards",
    icon: "🎹",
    description: "Warm classic vintage electric piano",
  },
  {
    id: "synth_warm",
    name: "Default Studio Synth",
    category: "Synths",
    icon: "🎛️",
    description: "Original polyphonic analog synthesizer",
  },
  {
    id: "synth_8bit",
    name: "Chiptune 8-Bit Synth",
    category: "Synths",
    icon: "👾",
    description: "Retro square-wave chiptune video game synth",
  },
  {
    id: "acoustic_guitar_steel",
    name: "Acoustic Steel Guitar",
    category: "Guitars",
    icon: "🎸",
    description: "Bright acoustic steel-string guitar",
  },
  {
    id: "acoustic_guitar_nylon",
    name: "Classical Nylon Guitar",
    category: "Guitars",
    icon: "🎸",
    description: "Mellow classical Spanish nylon guitar",
  },
  {
    id: "string_ensemble_1",
    name: "String Ensemble",
    category: "Strings",
    icon: "🎻",
    description: "Rich orchestral sustained strings",
  },
  {
    id: "electric_bass_finger",
    name: "Electric Finger Bass",
    category: "Bass",
    icon: "🎸",
    description: "Deep, punchy sampled fingerstyle bass",
  },
]

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
    return this.cache.get(id)?.loaded ?? false
  }

  /**
   * Load soundfont sample pack for the chosen instrument.
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

      // Pre-decode common octave keys (MIDI 21 to 108)
      const decodePromises: Promise<void>[] = []
      for (let midi = 21; midi <= 108; midi++) {
        const noteName = midiToSampleName(midi)
        const dataUri = rawData[noteName]
        if (dataUri) {
          decodePromises.push(this.decodeAndCache(ctx, id, midi, dataUri))
        }
      }

      await Promise.all(decodePromises)
      entry.loaded = true
      entry.loading = false
      this.notify(id, true)
      return true
    } catch (err) {
      console.warn(`[SoundfontEngine] Could not load ${id}, falling back to synthetic audio:`, err)
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
  ): Promise<void> {
    try {
      const base64 = dataUri.split(",")[1]
      if (!base64) return
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
    } catch (e) {
      // Individual note decode failure is non-fatal
    }
  }

  /**
   * Play a sampled acoustic note at a specific time.
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
      // Trigger lazy load in background if not already started
      if (!entry?.loading) {
        this.loadInstrument(instrumentId, ctx).catch(() => {})
      }
      return false
    }

    // Lookup exact note or nearest sampled note
    let buffer = entry.buffers.get(midi)
    let detuneCents = 0

    if (!buffer) {
      // Find closest available sampled note
      let closestMidi = -1
      let minDiff = 999
      for (const [m, buf] of entry.buffers.entries()) {
        const diff = Math.abs(m - midi)
        if (diff < minDiff) {
          minDiff = diff
          closestMidi = m
          buffer = buf
        }
      }
      if (closestMidi !== -1 && minDiff <= 6) {
        detuneCents = (midi - closestMidi) * 100
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
      const peak = Math.min(1.8, Math.max(0.15, velocity * 1.55))

      // Natural acoustic envelope
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.linearRampToValueAtTime(peak, when + 0.005)

      // Piano / guitar acoustic decay
      const decayTime = Math.min(buffer.duration, duration + 1.0)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.08), when + decayTime)
      gain.gain.setValueAtTime(0.0001, when + decayTime + 0.05)

      source.connect(gain)
      gain.connect(destination)

      source.start(when)
      source.stop(when + decayTime + 0.1)
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
