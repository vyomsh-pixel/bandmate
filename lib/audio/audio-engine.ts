/**
 * BandMate — Web Audio engine.
 *
 * A single, framework-agnostic audio engine responsible for:
 *   - synthesising chords/notes with a simple polyphonic ADSR synth
 *   - a lookahead-scheduled Transport that plays a chord progression in time
 *   - a metronome that clicks on every beat (accented on bar starts)
 *
 * Everything is time-scheduled against AudioContext.currentTime for accuracy.
 * Phase 1 uses this directly from Song Lab; later, Gesture Play will call
 * `playChord` / `playNote` from the same instance.
 */

import { midiToFreq } from "../music/notes"
import { getSoundfontEngine, type InstrumentId, AVAILABLE_INSTRUMENTS } from "./soundfont-engine"

export interface PlayOptions {
  /** Absolute AudioContext time to start (defaults to now). */
  when?: number
  /** Note length in seconds. */
  duration?: number
  /** 0-1 velocity. */
  velocity?: number
  /** Oscillator waveform for fallback synth. */
  wave?: OscillatorType
  /** Instrument ID to play. */
  instrument?: InstrumentId
}

export type RhythmPattern = "pulse" | "sustain" | "pop" | "arpeggio"

export interface TransportConfig {
  bpm: number
  beatsPerBar: number
  /** Ordered chords; each carries its MIDI notes and length in beats. */
  chords: { midis: number[]; beats: number }[]
  loop: boolean
  metronome: boolean
  rhythm?: RhythmPattern
}

export type BeatListener = (info: { beatInBar: number; accent: boolean; chordIndex: number | null }) => void

interface ScheduledUiEvent {
  time: number
  beatInBar: number
  accent: boolean
  chordIndex: number | null
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  // Transport state.
  private running = false
  private schedulerTimer: number | null = null
  private rafId: number | null = null
  private nextBeatTime = 0
  private beatInLoop = 0
  private countInBeatsLeft = 0
  private config: TransportConfig = { bpm: 120, beatsPerBar: 4, chords: [], loop: true, metronome: true, rhythm: "pulse" }
  private uiQueue: ScheduledUiEvent[] = []
  private beatListener: BeatListener | null = null
  private onStopped: (() => void) | null = null

  private readonly lookahead = 0.1 // seconds scheduled ahead
  private readonly interval = 25 // scheduler tick in ms

  /** Lazily create (and resume) the AudioContext. Must run after a user gesture. */
  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.85

      // Transparent dynamics compressor: tames sharp transients while keeping full body
      const compressor = this.ctx.createDynamicsCompressor()
      compressor.threshold.value = -12
      compressor.knee.value = 10
      compressor.ratio.value = 3.5
      compressor.attack.value = 0.003
      compressor.release.value = 0.12

      // Studio Makeup Gain: boosts overall output loudness to commercial streaming levels (+5.5 dB)
      const makeupGain = this.ctx.createGain()
      makeupGain.gain.value = 1.85

      this.master.connect(compressor)
      compressor.connect(makeupGain)
      makeupGain.connect(this.ctx.destination)

      // Listen for window focus & statechange to keep WebAudio engine alive on mobile/desktop
      if (typeof window !== "undefined") {
        window.addEventListener("focus", () => {
          if (this.ctx && (this.ctx.state === "suspended" || (this.ctx.state as string) === "interrupted")) {
            this.ctx.resume().catch(() => {})
          }
        })
      }

      this.ctx.onstatechange = () => {
        if (this.ctx && this.ctx.state === "suspended" && this.running) {
          this.ctx.resume().catch(() => {})
        }
      }
    }

    if (this.ctx.state === "suspended" || (this.ctx.state as string) === "interrupted") {
      await this.ctx.resume()
    }

    // Preload top core instruments in background so user has zero latency switching
    const sf = getSoundfontEngine()
    sf.loadInstrument("acoustic_grand_piano", this.ctx).catch(() => {})
    sf.loadInstrument("acoustic_guitar_nylon", this.ctx).catch(() => {})
    sf.loadInstrument("electric_piano_1", this.ctx).catch(() => {})
    sf.loadInstrument("string_ensemble_1", this.ctx).catch(() => {})

    return this.ctx
  }

  dispose() {
    this.stop()
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0
  }

  getInstrument(): InstrumentId {
    return getSoundfontEngine().getCurrentInstrument()
  }

  async setInstrument(id: InstrumentId) {
    getSoundfontEngine().setInstrument(id)
    if (this.ctx) {
      await getSoundfontEngine().loadInstrument(id, this.ctx)
    }
  }

  isInstrumentLoaded(id?: InstrumentId): boolean {
    return getSoundfontEngine().isInstrumentLoaded(id ?? getSoundfontEngine().getCurrentInstrument())
  }

  setMasterVolume(value: number) {
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(Math.max(0, Math.min(1, value)), now)
    }
  }

  /** Play a set of MIDI notes as a chord with realistic acoustic samples or synth. */
  playChord(midis: number[], options: PlayOptions = {}) {
    if (!this.ctx || !this.master) {
      this.ensureContext().then(() => this.playChord(midis, options)).catch(() => {})
      return
    }

    if (this.ctx.state === "suspended" || (this.ctx.state as string) === "interrupted") {
      this.ctx.resume().catch(() => {})
    }

    const currentInst = options.instrument ?? this.getInstrument()
    const { when = this.ctx.currentTime, duration = 1.6, velocity = 0.95, wave = "triangle" } = options
    
    // Humanized velocity jitter (+-5%)
    const jitter = (Math.random() * 0.1 - 0.05)
    const finalVelocity = Math.max(0.1, Math.min(1, velocity + jitter))

    // Increased base loudness multiplier
    const peak = (1.75 / Math.pow(Math.max(1, midis.length), 0.28)) * finalVelocity
    const minMidi = midis.length > 0 ? Math.min(...midis) : -1

    // Acoustic Strum Humanization (16ms micro-offsets per note to simulate realistic fingerpicking/strumming)
    const isAcoustic = currentInst.includes("guitar") || currentInst.includes("piano") || currentInst.includes("nylon")
    const strumStep = isAcoustic && midis.length > 1 ? 0.016 : 0 // 16ms roll between notes

    for (let i = 0; i < midis.length; i++) {
      const midi = midis[i]
      // Ensure the bass note / root note has extra weight and punch (25% boost)
      const voicePeak = midi === minMidi ? peak * 1.25 : peak
      const noteWhen = when + (i * strumStep)
      this.playVoice(midi, noteWhen, duration, voicePeak, wave, currentInst)
    }
  }

  /** Play a single MIDI note. */
  playNote(midi: number, options: PlayOptions = {}) {
    if (!this.ctx || !this.master) {
      this.ensureContext().then(() => this.playNote(midi, options)).catch(() => {})
      return
    }

    if (this.ctx.state === "suspended" || (this.ctx.state as string) === "interrupted") {
      this.ctx.resume().catch(() => {})
    }

    const currentInst = options.instrument ?? this.getInstrument()
    const { when = this.ctx.currentTime, duration = 1.4, velocity = 0.95, wave = "triangle" } = options
    this.playVoice(midi, when, duration, velocity * 1.7, wave, currentInst)
  }

  private playVoice(
    midi: number,
    when: number,
    duration: number,
    peak: number,
    wave: OscillatorType,
    instrument?: InstrumentId,
  ) {
    if (!this.ctx || !this.master) return
    const targetInst = instrument ?? this.getInstrument()

    // Try playing real acoustic sampled soundfont
    const playedSample = getSoundfontEngine().playSample(
      this.ctx,
      this.master,
      midi,
      when,
      duration,
      peak,
      targetInst,
    )
    if (playedSample) return

    // Fallback or Synthetic mode (synth_warm / synth_8bit)
    const ctx = this.ctx
    const freq = midiToFreq(midi)

    if (targetInst === "synth_8bit") {
      // Authentic NES / Game Boy chiptune with soft lowpass to eliminate piercing aliasing
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = "square"
      osc.frequency.value = freq
      filter.type = "lowpass"
      filter.frequency.value = 3200
      filter.Q.value = 0.7

      const peakLevel = Math.min(0.20, Math.max(0.04, peak * 0.12))
      const end = when + duration

      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.exponentialRampToValueAtTime(peakLevel, when + 0.003)
      gain.gain.setValueAtTime(peakLevel * 0.7, Math.max(when + 0.01, end - 0.05))
      gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.08)

      osc.connect(gain)
      gain.connect(filter)
      filter.connect(this.master)

      osc.start(when)
      osc.stop(end + 0.1)
      return
    }

    // "synth_warm" — Lush Vintage Analog Poly-Synth Pad (Prophet / Juno Style)
    // Twin detuned oscillators for authentic stereo-chorus width + warm 24dB low-pass filter
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc1.type = "sawtooth"
    osc1.frequency.value = freq
    osc1.detune.setValueAtTime(-5, when) // subtle 5-cent chorus spread

    osc2.type = "triangle"
    osc2.frequency.value = freq
    osc2.detune.setValueAtTime(+5, when)

    // Warm resonant analog ladder filter
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1200, when)
    filter.frequency.exponentialRampToValueAtTime(1750, when + 0.06)
    filter.frequency.exponentialRampToValueAtTime(1300, when + duration)
    filter.Q.value = 1.1

    // Calibrated studio gain: ~0.18 per voice so full 5-voice chords are rich and NEVER clip or blow out!
    const peakLevel = Math.min(0.22, Math.max(0.04, peak * 0.14))
    const end = when + duration
    const attack = 0.025
    const release = 0.35

    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.linearRampToValueAtTime(peakLevel, when + attack)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakLevel * 0.65), when + attack + 0.25)
    gain.gain.setValueAtTime(Math.max(0.0001, peakLevel * 0.65), Math.max(when + attack + 0.25, end - release))
    gain.gain.exponentialRampToValueAtTime(0.0001, end + release)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(filter)
    filter.connect(this.master)

    osc1.start(when)
    osc2.start(when)
    osc1.stop(end + release + 0.05)
    osc2.stop(end + release + 0.05)
  }

  /** A metronome click. accent = downbeat. */
  private click(when: number, accent: boolean) {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = accent ? 2000 : 1200
    const peak = accent ? 0.38 : 0.22
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(when)
    osc.stop(when + 0.06)
  }

  /** Total beats across the current progression. */
  private totalBeats(): number {
    return this.config.chords.reduce((sum, c) => sum + Math.max(1, c.beats), 0)
  }

  /** Which chord index a given beat-in-loop belongs to, and whether it's the chord's first beat. */
  private chordAtBeat(beat: number): { index: number | null; isStart: boolean; beatInChord: number } {
    let acc = 0
    for (let i = 0; i < this.config.chords.length; i++) {
      const beats = Math.max(1, this.config.chords[i].beats)
      if (beat >= acc && beat < acc + beats) {
        return { index: i, isStart: beat === acc, beatInChord: beat - acc }
      }
      acc += beats
    }
    return { index: null, isStart: false, beatInChord: 0 }
  }

  /** Update transport config live (e.g. bpm/metronome toggles while playing). */
  updateConfig(partial: Partial<TransportConfig>) {
    this.config = { ...this.config, ...partial }
  }

  isRunning() {
    return this.running
  }

  /** Start playing the progression. */
  async start(config: TransportConfig, beatListener: BeatListener, onStopped?: () => void) {
    await this.ensureContext()
    if (!this.ctx) return
    this.stop()
    this.config = config
    this.beatListener = beatListener
    this.onStopped = onStopped ?? null
    this.running = true
    this.beatInLoop = 0
    this.countInBeatsLeft = config.beatsPerBar
    this.nextBeatTime = this.ctx.currentTime + 0.08
    this.scheduler()
    this.drainUi()
  }

  /** Play a one-off preview of a chord progression is done via playChord directly. */
  stop() {
    this.running = false
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer)
      this.schedulerTimer = null
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.uiQueue = []
    if (this.onStopped) {
      const cb = this.onStopped
      this.onStopped = null
      cb()
    }
  }

  private scheduler = () => {
    if (!this.ctx || !this.running) return
    const secondsPerBeat = 60 / this.config.bpm
    const total = this.totalBeats()
    const rhythm = this.config.rhythm ?? "pulse"

    while (this.nextBeatTime < this.ctx.currentTime + this.lookahead) {
      if (this.countInBeatsLeft > 0) {
        // Count in phase
        const isDownbeat = this.countInBeatsLeft === this.config.beatsPerBar
        this.click(this.nextBeatTime, isDownbeat)
        // Send a negative beat index to UI to indicate count-in
        this.uiQueue.push({ time: this.nextBeatTime, beatInBar: -this.countInBeatsLeft, accent: isDownbeat, chordIndex: null })
        this.countInBeatsLeft--
      } else if (total === 0) {
        // Nothing to play but still tick metronome so the transport feels alive.
        const beatInBar = this.beatInLoop % this.config.beatsPerBar
        if (this.config.metronome) this.click(this.nextBeatTime, beatInBar === 0)
        this.uiQueue.push({ time: this.nextBeatTime, beatInBar, accent: beatInBar === 0, chordIndex: null })
        this.beatInLoop++
      } else {
        const beat = this.beatInLoop % total
        const beatInBar = beat % this.config.beatsPerBar
        const accent = beatInBar === 0
        const { index, isStart, beatInChord } = this.chordAtBeat(beat)

        if (this.config.metronome) this.click(this.nextBeatTime, accent)
        
        if (index !== null) {
          const chord = this.config.chords[index]
          if (rhythm === "sustain") {
            if (isStart) {
              const dur = Math.max(1, chord.beats) * secondsPerBeat * 0.95
              this.playChord(chord.midis, { when: this.nextBeatTime, duration: dur, velocity: 0.85 })
            }
          } else if (rhythm === "pulse") {
            // OneMotion style - pulse on every beat of the chord
            const vel = isStart ? 0.9 : 0.75
            const dur = secondsPerBeat * 0.9
            this.playChord(chord.midis, { when: this.nextBeatTime, duration: dur, velocity: vel })
          } else if (rhythm === "pop") {
            if (isStart) {
              this.playChord(chord.midis, { when: this.nextBeatTime, duration: secondsPerBeat * 0.9, velocity: 0.9 })
            } else {
              const upperNotes = chord.midis.slice(1).length > 0 ? chord.midis.slice(1) : chord.midis
              this.playChord(upperNotes, { when: this.nextBeatTime, duration: secondsPerBeat * 0.8, velocity: 0.72 })
            }
          } else if (rhythm === "arpeggio") {
            if (chord.midis.length > 0) {
              const noteIdx = beatInChord % chord.midis.length
              this.playNote(chord.midis[noteIdx], { when: this.nextBeatTime, duration: secondsPerBeat * 1.2, velocity: 0.82 })
            }
          }
        }
        
        this.uiQueue.push({ time: this.nextBeatTime, beatInBar, accent, chordIndex: index })

        this.beatInLoop++
        // Handle end-of-progression when not looping.
        if (!this.config.loop && this.beatInLoop >= total) {
          this.nextBeatTime += secondsPerBeat
          // Let the last chord ring, then stop.
          const stopAt = this.nextBeatTime
          const delay = Math.max(0, (stopAt - this.ctx.currentTime) * 1000) + 200
          window.setTimeout(() => this.stop(), delay)
          return
        }
      }
      this.nextBeatTime += secondsPerBeat
    }

    this.schedulerTimer = window.setTimeout(this.scheduler, this.interval)
  }

  /** Fire UI beat callbacks in sync with the audio clock. */
  private drainUi = () => {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    while (this.uiQueue.length && this.uiQueue[0].time <= now) {
      const ev = this.uiQueue.shift()!
      this.beatListener?.({ beatInBar: ev.beatInBar, accent: ev.accent, chordIndex: ev.chordIndex })
    }
    if (this.running || this.uiQueue.length) {
      this.rafId = requestAnimationFrame(this.drainUi)
    }
  }
}

/** Shared singleton — every module drives the same engine. */
let engine: AudioEngine | null = null
export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}

export type { AudioEngine }
