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

export interface PlayOptions {
  /** Absolute AudioContext time to start (defaults to now). */
  when?: number
  /** Note length in seconds. */
  duration?: number
  /** 0-1 velocity. */
  velocity?: number
  /** Oscillator waveform. */
  wave?: OscillatorType
}

export interface TransportConfig {
  bpm: number
  beatsPerBar: number
  /** Ordered chords; each carries its MIDI notes and length in beats. */
  chords: { midis: number[]; beats: number }[]
  loop: boolean
  metronome: boolean
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
  private config: TransportConfig = { bpm: 120, beatsPerBar: 4, chords: [], loop: true, metronome: true }
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
      this.master.gain.value = 0.6
      const compressor = this.ctx.createDynamicsCompressor()
      this.master.connect(compressor)
      compressor.connect(this.ctx.destination)
    }
    if (this.ctx.state === "suspended") await this.ctx.resume()
    return this.ctx
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0
  }

  setMasterVolume(value: number) {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01)
    }
  }

  /** Play a set of MIDI notes as a chord with a soft ADSR envelope. */
  playChord(midis: number[], options: PlayOptions = {}) {
    if (!this.ctx || !this.master) return
    const { when = this.ctx.currentTime, duration = 1.2, velocity = 0.8, wave = "triangle" } = options
    const peak = (0.9 / Math.max(1, midis.length)) * velocity
    for (const midi of midis) {
      this.playVoice(midi, when, duration, peak, wave)
    }
  }

  /** Play a single MIDI note. */
  playNote(midi: number, options: PlayOptions = {}) {
    if (!this.ctx || !this.master) return
    const { when = this.ctx.currentTime, duration = 0.9, velocity = 0.8, wave = "triangle" } = options
    this.playVoice(midi, when, duration, 0.6 * velocity, wave)
  }

  private playVoice(midi: number, when: number, duration: number, peak: number, wave: OscillatorType) {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const sub = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    filter.type = "lowpass"
    filter.frequency.value = 4200
    filter.Q.value = 0.6

    const freq = midiToFreq(midi)
    osc.type = wave
    osc.frequency.value = freq
    sub.type = "sine"
    sub.frequency.value = freq / 2
    const subGain = ctx.createGain()
    subGain.gain.value = 0.35

    // ADSR
    const attack = 0.01
    const decay = 0.18
    const sustain = peak * 0.72
    const release = 0.35
    const end = when + duration

    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + attack)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), when + attack + decay)
    gain.gain.setValueAtTime(Math.max(0.0001, sustain), Math.max(when + attack + decay, end - release))
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
    const peak = accent ? 0.28 : 0.16
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
  private chordAtBeat(beat: number): { index: number | null; isStart: boolean } {
    let acc = 0
    for (let i = 0; i < this.config.chords.length; i++) {
      const beats = Math.max(1, this.config.chords[i].beats)
      if (beat >= acc && beat < acc + beats) {
        return { index: i, isStart: beat === acc }
      }
      acc += beats
    }
    return { index: null, isStart: false }
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
        const { index, isStart } = this.chordAtBeat(beat)

        if (this.config.metronome) this.click(this.nextBeatTime, accent)
        if (isStart && index !== null) {
          const chord = this.config.chords[index]
          const dur = Math.max(1, chord.beats) * secondsPerBeat * 0.95
          this.playChord(chord.midis, { when: this.nextBeatTime, duration: dur, velocity: 0.85 })
        }
        this.uiQueue.push({ time: this.nextBeatTime, beatInBar, accent, chordIndex: isStart ? index : null })

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
