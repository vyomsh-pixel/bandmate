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
 * Generate a .mid binary Uint8Array for a given Song.
 */
export function generateMidiFile(song: Song): Uint8Array {
  const ticksPerBeat = 480 // Standard DAW resolution (480 PPQN)
  const bpm = Math.max(30, Math.min(300, song.bpm))
  const microsecondsPerBeat = Math.round(60000000 / bpm)
  const accidental = keyAccidental(song.keyTonic, song.keyMode)

  const trackEvents: number[] = []

  // 1. Tempo Meta Event: FF 51 03 [3-byte microseconds per beat]
  trackEvents.push(0x00) // Delta time 0
  trackEvents.push(0xff, 0x51, 0x03)
  trackEvents.push((microsecondsPerBeat >> 16) & 0xff)
  trackEvents.push((microsecondsPerBeat >> 8) & 0xff)
  trackEvents.push(microsecondsPerBeat & 0xff)

  // 2. Time Signature Meta Event: FF 58 04 [num] [denom_pow] 24 08
  trackEvents.push(0x00) // Delta time 0
  trackEvents.push(0xff, 0x58, 0x04)
  trackEvents.push(song.beatsPerBar, 0x02, 0x18, 0x08) // 0x02 = 2^2 = 4 (quarter note)

  // 3. Track Name Meta Event
  const trackName = `${song.title} - BandMate Chord Progression`
  const trackNameBytes = Array.from(new TextEncoder().encode(trackName))
  trackEvents.push(0x00)
  trackEvents.push(0xff, 0x03, ...toVLQ(trackNameBytes.length), ...trackNameBytes)

  // 4. Iterate over song sections & chords to create Note On / Note Off events
  const allChords = song.sections.flatMap((s) => s.chords)

  for (const entry of allChords) {
    const parsed = parseChord(entry.symbol)
    if (!parsed.valid) continue

    const midis = playableVoicing(parsed, {
      octave: 4,
      accidental,
      inversion: entry.inversion ?? 0,
    }).map((n) => n.midi)

    if (midis.length === 0) continue

    const durationBeats = Math.max(1, entry.beats)
    const durationTicks = durationBeats * ticksPerBeat

    // Note On for all notes in chord (delta 0 between notes)
    for (let i = 0; i < midis.length; i++) {
      const delta = i === 0 ? 0 : 0
      trackEvents.push(...toVLQ(delta))
      trackEvents.push(0x90, midis[i] & 0x7f, 0x60) // Velocity 96 (0x60)
    }

    // Note Off for all notes in chord (delta = durationTicks for first note, 0 for rest)
    for (let i = 0; i < midis.length; i++) {
      const delta = i === 0 ? durationTicks : 0
      trackEvents.push(...toVLQ(delta))
      trackEvents.push(0x80, midis[i] & 0x7f, 0x00)
    }
  }

  // 5. End of Track Meta Event: FF 2F 00
  trackEvents.push(0x00)
  trackEvents.push(0xff, 0x2f, 0x00)

  // Assemble Standard MIDI File (SMF Format 0)
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    ...toBE32(6),          // Length = 6
    ...toBE16(0),          // Format 0 (Single Track)
    ...toBE16(1),          // Number of tracks = 1
    ...toBE16(ticksPerBeat)// Division = 480 PPQN
  ]

  const trackChunk = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    ...toBE32(trackEvents.length),
    ...trackEvents,
  ]

  return new Uint8Array([...headerChunk, ...trackChunk])
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
