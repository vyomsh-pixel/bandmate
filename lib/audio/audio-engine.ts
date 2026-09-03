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
      this.master.gain.value = 1.0

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
    }
    if (this.ctx.state === "suspended") await this.ctx.resume()

    // Preload acoustic grand piano samples in background
    const sf = getSoundfontEngine()
    sf.loadInstrument(sf.getCurrentInstrument(), this.ctx).catch(() => {})

    return this.ctx
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
      this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01)
    }
  }

  /** Play a set of MIDI notes as a chord with realistic acoustic samples or synth. */
  playChord(midis: number[], options: PlayOptions = {}) {
    if (!this.ctx || !this.master) return
    const currentInst = options.instrument ?? this.getInstrument()
    const { when = this.ctx.currentTime, duration = 1.6, velocity = 0.95, wave = "triangle" } = options
    
    // Increased base loudness multiplier
    const peak = (1.75 / Math.pow(Math.max(1, midis.length), 0.28)) * velocity
    const minMidi = midis.length > 0 ? Math.min(...midis) : -1

    for (const midi of midis) {
      // Ensure the bass note / root note has extra weight and punch (25% boost)
      const voicePeak = midi === minMidi ? peak * 1.25 : peak
      this.playVoice(midi, when, duration, voicePeak, wave, currentInst)
    }
  }

  /** Play a single MIDI note. */
  playNote(midi: number, options: PlayOptions = {}) {
    if (!this.ctx || !this.master) return
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
    const osc = ctx.createOscillator()
    const sub = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    const synthWave: OscillatorType = targetInst === "synth_8bit" ? "square" : targetInst === "synth_warm" ? "triangle" : wave
    filter.type = targetInst === "synth_8bit" ? "allpass" : "lowpass"
    filter.frequency.value = targetInst === "synth_8bit" ? 8000 : 4200
    filter.Q.value = 0.6

    const freq = midiToFreq(midi)
    osc.type = synthWave
    osc.frequency.value = freq
    sub.type = targetInst === "synth_8bit" ? "square" : "sine"
    sub.frequency.value = freq / 2
    const subGain = ctx.createGain()
    subGain.gain.value = targetInst === "synth_8bit" ? 0.35 : 0.6

    // ADSR
    const attack = targetInst === "synth_8bit" ? 0.002 : 0.01
    const decay = 0.22
    const sustain = peak * 0.85
    const release = targetInst === "synth_8bit" ? 0.15 : 0.4
    const end = when + duration

    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 1.35), when + attack)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain * 1.35), when + attack + decay)
    gain.gain.setValueAtTime(Math.max(0.0001, sustain * 1.35), Math.max(when + attack + decay, end - release))
    gain.gain.exponentialRampToValueAtTime(0.0001, end + release)

    osc.connect(gain)
    sub.connect(subGain)
    subGain.connect(gain)
    gain.connect(filter)
    filter.connect(this.master)

    osc.start(when)
    sub.start(when)
    osc.stop(end + release + 0.05)
    sub.stop(end + release + 0.05)
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
