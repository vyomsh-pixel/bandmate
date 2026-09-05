/**
 * BandMate — Standard MIDI File (SMF Format 0) Exporter.
 *
 * Generates a valid binary .mid file from a Song object so musicians can
 * drag & drop their chord progression directly into Logic Pro, Ableton, FL Studio,
 * GarageBand, Pro Tools, or Cubase!
 */

import { parseChord } from "../music/chord-parser"
import { playableVoicing } from "../music/chords"
import { keyAccidental } from "../music/scales"
import type { Song } from "../music/types"

/** Convert integer number into variable-length quantity (VLQ) bytes for MIDI. */
function toVLQ(value: number): number[] {
  const bytes: number[] = []
  let v = value
  bytes.push(v & 0x7f)
  while ((v >>= 7) > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
  }
  return bytes
}

/** Convert a 32-bit unsigned integer to 4 Big-Endian bytes. */
function toBE32(val: number): number[] {
  return [
    (val >> 24) & 0xff,
    (val >> 16) & 0xff,
    (val >> 8) & 0xff,
    val & 0xff,
  ]
}

/** Convert a 16-bit unsigned integer to 2 Big-Endian bytes. */
function toBE16(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff]
}

/**
 * Generate a .mid binary Uint8Array for a given Song (SMF Format 1, 2 Tracks).
 * - Track 1: Harmony / Chord Voicings (Channel 0)
 * - Track 2: Bass Line (Channel 1, transposed to bass register C2-C4)
 */
export function generateMidiFile(song: Song): Uint8Array {
  const ticksPerBeat = 480 // Standard DAW resolution (480 PPQN)
  const bpm = Math.max(30, Math.min(300, song.bpm))
  const microsecondsPerBeat = Math.round(60000000 / bpm)
  const accidental = keyAccidental(song.keyTonic, song.keyMode)

  const allChords = song.sections.flatMap((s) => s.chords)

  // =========================================================================
  // TRACK 1: CHORD HARMONY (Channel 0)
  // =========================================================================
  const chordTrackEvents: number[] = []

  // 1. Tempo & Time Signature Meta Events
  chordTrackEvents.push(0x00, 0xff, 0x51, 0x03)
  chordTrackEvents.push((microsecondsPerBeat >> 16) & 0xff)
  chordTrackEvents.push((microsecondsPerBeat >> 8) & 0xff)
  chordTrackEvents.push(microsecondsPerBeat & 0xff)

  chordTrackEvents.push(0x00, 0xff, 0x58, 0x04)
  chordTrackEvents.push(song.beatsPerBar, 0x02, 0x18, 0x08)

  const t1Name = `${song.title} - Chords`
  const t1NameBytes = Array.from(new TextEncoder().encode(t1Name))
  chordTrackEvents.push(0x00, 0xff, 0x03, ...toVLQ(t1NameBytes.length), ...t1NameBytes)

  for (const entry of allChords) {
    const parsed = parseChord(entry.symbol)
    if (!parsed.valid) continue

    const midis = playableVoicing(parsed, {
      octave: 4,
      accidental,
      inversion: entry.inversion ?? 0,
    }).map((n) => n.midi)

    if (midis.length === 0) continue
    const durationTicks = Math.max(1, entry.beats) * ticksPerBeat

    // Note On (Channel 0)
    for (let i = 0; i < midis.length; i++) {
      chordTrackEvents.push(...toVLQ(0))
      chordTrackEvents.push(0x90, midis[i] & 0x7f, 0x60)
    }

    // Note Off (Channel 0)
    for (let i = 0; i < midis.length; i++) {
      const delta = i === 0 ? durationTicks : 0
      chordTrackEvents.push(...toVLQ(delta))
      chordTrackEvents.push(0x80, midis[i] & 0x7f, 0x00)
    }
  }
  chordTrackEvents.push(0x00, 0xff, 0x2f, 0x00)

  // =========================================================================
  // TRACK 2: BASS LINE (Channel 1)
  // =========================================================================
  const bassTrackEvents: number[] = []

  const t2Name = `${song.title} - Bass`
  const t2NameBytes = Array.from(new TextEncoder().encode(t2Name))
  bassTrackEvents.push(0x00, 0xff, 0x03, ...toVLQ(t2NameBytes.length), ...t2NameBytes)

  for (const entry of allChords) {
    const parsed = parseChord(entry.symbol)
    if (!parsed.valid) continue

    const rootMidi = parsed.bassPc !== null ? parsed.bassPc + 36 : parsed.rootPc + 36
    const durationTicks = Math.max(1, entry.beats) * ticksPerBeat

    // Bass Note On (Channel 1)
    bassTrackEvents.push(...toVLQ(0))
    bassTrackEvents.push(0x91, rootMidi & 0x7f, 0x68)

    // Bass Note Off (Channel 1)
    bassTrackEvents.push(...toVLQ(durationTicks))
    bassTrackEvents.push(0x81, rootMidi & 0x7f, 0x00)
  }
  bassTrackEvents.push(0x00, 0xff, 0x2f, 0x00)

  // Assemble Standard MIDI File (SMF Format 1 - Multi Track)
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    ...toBE32(6),          // Length = 6
    ...toBE16(1),          // Format 1 (Multi-Track)
    ...toBE16(2),          // Number of tracks = 2
    ...toBE16(ticksPerBeat)// Division = 480 PPQN
  ]

  const track1Chunk = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    ...toBE32(chordTrackEvents.length),
    ...chordTrackEvents,
  ]

  const track2Chunk = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    ...toBE32(bassTrackEvents.length),
    ...bassTrackEvents,
  ]

  return new Uint8Array([...headerChunk, ...track1Chunk, ...track2Chunk])
}

/**
 * Trigger a browser file download of the MIDI file.
 */
export function downloadMidi(song: Song) {
  const binaryData = generateMidiFile(song)
  const blob = new Blob([binaryData], { type: "audio/midi" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const fileName = `${song.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "progression"}.mid`
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
