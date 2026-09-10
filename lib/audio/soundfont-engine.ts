/**
 * BandMate — Real Sampled Soundfont Engine.
 *
 * Loads high-quality acoustic soundfont samples (Grand Piano, Rhodes, Guitars,
 * Strings, Bass) into Web Audio AudioBuffers with calibrated gain staging,
 * musical ADSR envelopes, and on-demand background decoding.
 */

export type InstrumentId =
  // Keyboards & Organs
  | "acoustic_grand_piano"
  | "bright_acoustic_piano"
  | "electric_piano_1"
  | "electric_piano_2"
  | "harpsichord"
  | "drawbar_organ"
  | "rock_organ"
  | "vibraphone"
  | "marimba"
  // Guitars
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz"
  | "overdriven_guitar"
  | "distortion_guitar"
  // Bass
  | "electric_bass_finger"
  | "acoustic_bass"
  | "slap_bass_1"
  | "synth_bass_1"
  // Strings & Orchestral
  | "string_ensemble_1"
  | "orchestral_harp"
  | "pizzicato_strings"
  | "choir_aahs"
  // Brass & Winds
  | "brass_section"
  | "tenor_sax"
  | "flute"
  // Synths & Soundscapes
  | "synth_warm"
  | "pad_1_new_age"
  | "lead_2_sawtooth"
  | "synth_8bit"

export interface InstrumentInfo {
  id: InstrumentId
  name: string
  category: "Keyboards" | "Guitars" | "Bass" | "Strings" | "Brass & Winds" | "Synths"
  icon: string
  description: string
}

export const AVAILABLE_INSTRUMENTS: InstrumentInfo[] = [
  // Keyboards
  {
    id: "acoustic_grand_piano",
    name: "Concert Grand Piano",
    category: "Keyboards",
    icon: "piano",
    description: "Authentic sampled Steinway acoustic grand piano",
  },
  {
    id: "bright_acoustic_piano",
    name: "Bright Pop Piano",
    category: "Keyboards",
    icon: "piano",
    description: "Punchy, crisp Yamaha C7-style pop piano",
  },
  {
    id: "electric_piano_1",
    name: "Vintage Rhodes EP",
    category: "Keyboards",
    icon: "piano",
    description: "Warm classic vintage Rhodes electric piano with silky tines",
  },
  {
    id: "electric_piano_2",
    name: "FM EP (DX7)",
    category: "Keyboards",
    icon: "piano",
    description: "Sparkling 80s digital FM electric piano",
  },
  {
    id: "harpsichord",
    name: "Baroque Harpsichord",
    category: "Keyboards",
    icon: "piano",
    description: "Crisp double-manual orchestral harpsichord",
  },
  {
    id: "drawbar_organ",
    name: "Hammond B3 Organ",
    category: "Keyboards",
    icon: "piano",
    description: "Rich vintage drawbar organ with rotary Leslie speaker",
  },
  {
    id: "rock_organ",
    name: "Overdriven Rock Organ",
    category: "Keyboards",
    icon: "piano",
    description: "Punchy, gritty overdriven rock Hammond organ",
  },
  {
    id: "vibraphone",
    name: "Jazz Vibraphone",
    category: "Keyboards",
    icon: "piano",
    description: "Mellow metallic vibes with soft tremolo motor",
  },
  {
    id: "marimba",
    name: "Wooden Marimba",
    category: "Keyboards",
    icon: "piano",
    description: "Deep, warm percussive wooden orchestral marimba",
  },

  // Guitars
  {
    id: "acoustic_guitar_nylon",
    name: "Classical Nylon Guitar",
    category: "Guitars",
    icon: "guitar",
    description: "Warm, intimate Spanish classical nylon guitar",
  },
  {
    id: "acoustic_guitar_steel",
    name: "Steel String Acoustic",
    category: "Guitars",
    icon: "guitar",
    description: "Bright acoustic steel-string dreadnought",
  },
  {
    id: "electric_guitar_clean",
    name: "Clean Electric Guitar",
    category: "Guitars",
    icon: "guitar",
    description: "Mellow hollowbody jazz & neo-soul electric guitar",
  },
  {
    id: "electric_guitar_jazz",
    name: "Hollowbody Jazz Guitar",
    category: "Guitars",
    icon: "guitar",
    description: "Smooth, warm archtop jazz guitar",
  },
  {
    id: "overdriven_guitar",
    name: "Overdrive Crunch Guitar",
    category: "Guitars",
    icon: "guitar",
    description: "Crunchy classic rock overdriven electric guitar",
  },
  {
    id: "distortion_guitar",
    name: "Heavy Distortion Guitar",
    category: "Guitars",
    icon: "guitar",
    description: "High-gain distortion guitar for heavy rock & metal",
  },

  // Bass
  {
    id: "electric_bass_finger",
    name: "Electric Finger Bass",
    category: "Bass",
    icon: "bass",
    description: "Deep, punchy fingerstyle bass in true low register",
  },
  {
    id: "acoustic_bass",
    name: "Upright Acoustic Bass",
    category: "Bass",
    icon: "bass",
    description: "Deep, resonant acoustic jazz upright bass",
  },
  {
    id: "slap_bass_1",
    name: "Funk Slap Bass",
    category: "Bass",
    icon: "bass",
    description: "Punchy popping funk slap bass with thumb attack",
  },
  {
    id: "synth_bass_1",
    name: "Synth Bass 303",
    category: "Bass",
    icon: "bass",
    description: "Heavy resonant analog synth bass for modern grooves",
  },

  // Strings & Orchestral
  {
    id: "string_ensemble_1",
    name: "Cinematic String Ensemble",
    category: "Strings",
    icon: "strings",
    description: "Rich orchestral sustained violins & cellos with bow swell",
  },
  {
    id: "orchestral_harp",
    name: "Concert Harp",
    category: "Strings",
    icon: "strings",
    description: "Delicate plucked concert orchestral harp",
  },
  {
    id: "pizzicato_strings",
    name: "Pizzicato Strings",
    category: "Strings",
    icon: "strings",
    description: "Staccato plucked string ensemble",
  },
  {
    id: "choir_aahs",
    name: "Lush Choir Aahs",
    category: "Strings",
    icon: "strings",
    description: "Atmospheric vocal choir ensemble with sustained vowels",
  },

  // Brass & Winds
  {
    id: "brass_section",
    name: "Pop Brass Section",
    category: "Brass & Winds",
    icon: "brass",
    description: "Punchy horn section (trumpets, trombones, saxes)",
  },
  {
    id: "tenor_sax",
    name: "Tenor Saxophone",
    category: "Brass & Winds",
    icon: "brass",
    description: "Warm, expressive solo tenor saxophone",
  },
  {
    id: "flute",
    name: "Concert Flute",
    category: "Brass & Winds",
    icon: "brass",
    description: "Smooth orchestral woodwind concert flute",
  },

  // Synths & Soundscapes
  {
    id: "synth_warm",
    name: "Lush Analog Synth Pad",
    category: "Synths",
    icon: "synth",
    description: "Silky Juno/Prophet-style warm analog poly-synth",
  },
  {
    id: "pad_1_new_age",
    name: "New Age Ambient Pad",
    category: "Synths",
    icon: "synth",
    description: "Shimmering cosmic synth pad with evolving harmonics",
  },
  {
    id: "lead_2_sawtooth",
    name: "Analog Saw Lead",
    category: "Synths",
    icon: "synth",
    description: "Cutting 80s analog sawtooth synth lead",
  },
  {
    id: "synth_8bit",
    name: "Chiptune 8-Bit Synth",
    category: "Synths",
    icon: "synth",
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
  // Keyboards
  acoustic_grand_piano: { gainScale: 0.52, attack: 0.005, decay: 1.6, sustain: 0.35, release: 0.15 },
  bright_acoustic_piano: { gainScale: 0.50, attack: 0.004, decay: 1.5, sustain: 0.35, release: 0.15 },
  electric_piano_1: { gainScale: 0.48, attack: 0.006, decay: 1.8, sustain: 0.45, release: 0.20 },
  electric_piano_2: { gainScale: 0.45, attack: 0.005, decay: 1.6, sustain: 0.40, release: 0.20 },
  harpsichord: { gainScale: 0.42, attack: 0.003, decay: 1.1, sustain: 0.25, release: 0.10 },
  drawbar_organ: { gainScale: 0.38, attack: 0.010, decay: 0.2, sustain: 0.82, release: 0.15, isSustained: true },
  rock_organ: { gainScale: 0.36, attack: 0.008, decay: 0.2, sustain: 0.85, release: 0.15, isSustained: true },
  vibraphone: { gainScale: 0.45, attack: 0.005, decay: 2.2, sustain: 0.50, release: 0.25 },
  marimba: { gainScale: 0.46, attack: 0.004, decay: 0.9, sustain: 0.20, release: 0.12 },

  // Guitars
  acoustic_guitar_nylon: { gainScale: 0.44, attack: 0.012, decay: 1.3, sustain: 0.38, release: 0.18 },
  acoustic_guitar_steel: { gainScale: 0.44, attack: 0.008, decay: 1.4, sustain: 0.38, release: 0.18 },
  electric_guitar_clean: { gainScale: 0.42, attack: 0.010, decay: 1.6, sustain: 0.50, release: 0.22 },
  electric_guitar_jazz: { gainScale: 0.42, attack: 0.012, decay: 1.7, sustain: 0.52, release: 0.22 },
  overdriven_guitar: { gainScale: 0.38, attack: 0.008, decay: 1.5, sustain: 0.60, release: 0.20 },
  distortion_guitar: { gainScale: 0.35, attack: 0.008, decay: 1.5, sustain: 0.65, release: 0.20 },

  // Bass
  electric_bass_finger: { gainScale: 0.55, attack: 0.008, decay: 1.4, sustain: 0.55, release: 0.20, octaveShift: -12 },
  acoustic_bass: { gainScale: 0.52, attack: 0.010, decay: 1.5, sustain: 0.50, release: 0.22, octaveShift: -12 },
  slap_bass_1: { gainScale: 0.52, attack: 0.005, decay: 1.1, sustain: 0.42, release: 0.15, octaveShift: -12 },
  synth_bass_1: { gainScale: 0.48, attack: 0.006, decay: 1.2, sustain: 0.50, release: 0.18, octaveShift: -12 },

  // Strings & Orchestral
  string_ensemble_1: { gainScale: 0.35, attack: 0.110, decay: 0.4, sustain: 0.88, release: 0.45, isSustained: true },
  orchestral_harp: { gainScale: 0.44, attack: 0.006, decay: 1.8, sustain: 0.35, release: 0.20 },
  pizzicato_strings: { gainScale: 0.46, attack: 0.004, decay: 0.6, sustain: 0.15, release: 0.10 },
  choir_aahs: { gainScale: 0.34, attack: 0.120, decay: 0.4, sustain: 0.85, release: 0.45, isSustained: true },

  // Brass & Winds
  brass_section: { gainScale: 0.36, attack: 0.025, decay: 0.3, sustain: 0.78, release: 0.20, isSustained: true },
  tenor_sax: { gainScale: 0.40, attack: 0.020, decay: 0.3, sustain: 0.75, release: 0.20, isSustained: true },
  flute: { gainScale: 0.38, attack: 0.030, decay: 0.3, sustain: 0.75, release: 0.20, isSustained: true },

  // Synths & Soundscapes
  synth_warm: { gainScale: 0.18, attack: 0.025, decay: 0.35, sustain: 0.65, release: 0.35 },
  pad_1_new_age: { gainScale: 0.32, attack: 0.100, decay: 0.4, sustain: 0.85, release: 0.45, isSustained: true },
  lead_2_sawtooth: { gainScale: 0.35, attack: 0.010, decay: 0.3, sustain: 0.70, release: 0.20, isSustained: true },
  synth_8bit: { gainScale: 0.12, attack: 0.003, decay: 0.15, sustain: 0.55, release: 0.10 },
}

const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

export function midiToSampleName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12
  const oct = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[pc]}${oct}`
}

const SOUNDFONT_CDN_BASES = [
  "https://gleitz.github.io/midi-js-soundfonts/MusyngKite",
  "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM",
]

// Native zero-dependency IndexedDB cache for soundfont payloads
const DB_NAME = "BandMateSoundfonts"
const STORE_NAME = "soundfont_raw"

function getIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null)
      return
    }
    try {
      if (!("indexedDB" in window) || !window.indexedDB) {
        resolve(null)
        return
      }
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch (e) {
      resolve(null)
    }
  })
}

async function getCachedRawData(id: string): Promise<Record<string, string> | null> {
  const db = await getIDB()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    } catch (e) {
      resolve(null)
    }
  })
}

async function setCachedRawData(id: string, data: Record<string, string>): Promise<void> {
  const db = await getIDB()
  if (!db) return
  try {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.put(data, id)
  } catch (e) {}
}

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
        // Try IndexedDB first
        const cached = await getCachedRawData(id)
        if (cached) {
          rawData = cached
          this.rawDataCache.set(id, rawData)
        }
      }

      if (!rawData) {
        let lastErr: unknown = null
        for (const baseUrl of SOUNDFONT_CDN_BASES) {
          try {
            const url = `${baseUrl}/${id}-mp3.js`
            const res = await fetch(url)
            if (!res.ok) continue
            const text = await res.text()

            const MIDI: Record<string, unknown> = {}
            const fn = new Function("MIDI", `${text}; return MIDI;`)
            const result = fn(MIDI) as { Soundfont?: Record<string, Record<string, string>> }

            if (result.Soundfont && result.Soundfont[id]) {
              rawData = result.Soundfont[id]
              break
            }
          } catch (err) {
            lastErr = err
          }
        }

        if (!rawData) {
          throw new Error(`Failed to load soundfont for ${id}: ${lastErr}`)
        }
        this.rawDataCache.set(id, rawData)
        // Store in IndexedDB asynchronously
        setCachedRawData(id, rawData).catch(() => {})
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
