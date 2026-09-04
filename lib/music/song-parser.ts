/**
 * BandMate — Natural Language Song & Description Parser.
 *
 * Parses freeform text descriptions, chord sheets, and AI prompts into a full
 * BandMate Song object (title, key, mode, BPM, beatsPerBar, and sections with chords).
 */

import { parseChord } from "./chord-parser"
import { createId } from "../storage/local-store"
import type { ChordEntry, Section, Song } from "./types"

export interface ParsedSongResult {
  title: string
  keyTonic: string
  keyMode: "major" | "minor"
  bpm: number
  beatsPerBar: number
  sections: Section[]
}

/**
 * Normalizes minor/major key tonic spelling and mode.
 */
function parseKeyString(rawKey: string): { keyTonic: string; keyMode: "major" | "minor" } {
  // e.g. "C Major / A Minor" -> match first "C Major"
  const match = rawKey.match(/([A-G][#b♭♯]?)\s*(major|minor|maj|min|m)?/i)
  if (!match) return { keyTonic: "C", keyMode: "major" }

  let tonic = match[1]
  const firstLetter = tonic[0].toUpperCase()
  let accidentalSymbol = tonic.slice(1)
  if (accidentalSymbol.toLowerCase() === "b") accidentalSymbol = "b"
  if (accidentalSymbol === "♯") accidentalSymbol = "#"
  if (accidentalSymbol === "♭") accidentalSymbol = "b"
  tonic = firstLetter + accidentalSymbol

  const rawMode = (match[2] || "").toLowerCase()
  const keyMode: "major" | "minor" =
    rawMode === "minor" || rawMode === "min" || rawMode === "m" ? "minor" : "major"

  return { keyTonic: tonic, keyMode }
}

/**
 * Extracts numeric beats from patterns like "(4 beats)", "(4b)", "(4)", "4 beats"
 */
function extractBeats(token: string, defaultBeats: number): number {
  const parenMatch = token.match(/\(\s*(\d+)\s*(?:beats|b)?\s*\)/i)
  if (parenMatch) {
    const num = parseInt(parenMatch[1], 10)
    if (!isNaN(num) && num >= 1 && num <= 32) return num
  }
  const trailingMatch = token.match(/\s+(\d+)\s*(?:beats|b)/i)
  if (trailingMatch) {
    const num = parseInt(trailingMatch[1], 10)
    if (!isNaN(num) && num >= 1 && num <= 32) return num
  }
  return defaultBeats
}

/**
 * Parses freeform description text into a structured Song object.
 */
export function parseSongFromDescription(text: string): ParsedSongResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  let title = "Untitled Song"
  let keyTonic = "C"
  let keyMode: "major" | "minor" = "major"
  let bpm = 120
  let beatsPerBar = 4
  const sections: Section[] = []

  let currentSectionName = "Main Section"
  let currentChords: ChordEntry[] = []

  const commitSection = () => {
    if (currentChords.length > 0) {
      sections.push({
        id: createId(),
        name: currentSectionName,
        chords: [...currentChords],
      })
      currentChords = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 1. Title Extraction:
    // e.g. '4. "Fly Me To The Moon" — Frank Sinatra' or 'Title: Fly Me To The Moon'
    const titlePrefixed = line.match(/^(?:title|song|track|name):\s*(.+)$/i)
    const quotedTitle = line.match(/(?:^\d+[\.\)\s-]*)?["'“]([^"'”]+)["'”]/)

    if (titlePrefixed) {
      title = titlePrefixed[1].trim()
    } else if (quotedTitle && title === "Untitled Song") {
      // Extract title & artist e.g. 4. "Fly Me To The Moon" — Frank Sinatra
      const remaining = line.replace(/^(?:\d+[\.\)\s-]*)?["'“][^"'”]+["'”]\s*[-—–]?\s*/, "").trim()
      title = remaining ? `${quotedTitle[1]} (${remaining})` : quotedTitle[1]
    } else if (i === 0 && !line.includes(":") && !line.includes("Key") && title === "Untitled Song") {
      title = line.replace(/^(?:\d+[\.\)\s-]*)?/, "").replace(/[-—–].*$/, "").trim()
    }

    // 2. Key Extraction:
    // e.g. 'Key: C Major / A Minor' or 'Key: C Major' or 'Key C'
    const keyMatch = line.match(/key:\s*([A-G][#b♭♯]?(?:\s*(?:major|minor|maj|min|m))?)/i)
    if (keyMatch) {
      const parsed = parseKeyString(keyMatch[1])
      keyTonic = parsed.keyTonic
      keyMode = parsed.keyMode
    }

    // 3. BPM Extraction:
    // e.g. 'BPM: 120' or 'Tempo: 120' or '120 BPM'
    const bpmMatch = line.match(/(?:bpm|tempo):\s*(\d+)/i) || line.match(/(\d+)\s*bpm/i)
    if (bpmMatch) {
      const parsedBpm = parseInt(bpmMatch[1], 10)
      if (!isNaN(parsedBpm) && parsedBpm >= 30 && parsedBpm <= 300) {
        bpm = parsedBpm
      }
    }

    // 4. Time Signature Extraction:
    // e.g. 'Time Signature: 4/4' or '4/4' or '3/4'
    const tsMatch = line.match(/(?:time signature|meter):\s*(\d+)\/(\d+)/i) || line.match(/(\d+)\/(\d+)/)
    if (tsMatch) {
      const num = parseInt(tsMatch[1], 10)
      if (!isNaN(num) && num >= 1 && num <= 16) {
        beatsPerBar = num
      }
    }

    // 5. Multi-Section Header Detection:
    // Matches '[Verse 1]', 'Verse 1:', 'Verse 1 (8 Bars):', 'Chorus', 'Pre-Chorus', 'Bridge', 'Outro', 'Section A', etc.
    const isSectionBreakdownLabel = line.match(/^(?:section\s+breakdown|section\s+structure|song\s+structure)/i)

    const isExplicitSectionKeyword = line.match(
      /^(?:\[?\s*(?:verse\s*\d*|chorus\s*\d*|pre-?chorus\s*\d*|post-?chorus\s*\d*|bridge\s*\d*|intro\s*\d*|outro\s*\d*|solo\s*\d*|interlude\s*\d*|coda\s*\d*|ending\s*\d*|tag\s*\d*|head\s*\d*|hook\s*\d*|refrain\s*\d*|break\s*\d*|part\s*[a-z0-9]+|(?:[a-z0-9]+\s+)?section(?:\s+[a-z0-9]+)?)\s*\]?)(?:\s*\(\d+\s*bars?\))?:?$/i
    )

    const isGenericColonHeader =
      line.endsWith(":") &&
      !line.toLowerCase().startsWith("key:") &&
      !line.toLowerCase().startsWith("genre:") &&
      !line.toLowerCase().startsWith("bpm:") &&
      !line.toLowerCase().startsWith("tempo:") &&
      !line.toLowerCase().startsWith("time signature:") &&
      !line.toLowerCase().startsWith("best to test:") &&
      !line.toLowerCase().startsWith("title:") &&
      !line.toLowerCase().startsWith("artist:")

    const isBracketHeader = line.match(/^\[[^\]]+\]$/)

    if (isSectionBreakdownLabel || isExplicitSectionKeyword || isGenericColonHeader || isBracketHeader) {
      if (!isSectionBreakdownLabel) {
        commitSection()
        currentSectionName = line
          .replace(/^\[\s*/, "")
          .replace(/\s*\]$/, "")
          .replace(/:$/, "")
          .replace(/\s*\(\d+\s*bars?\)/i, "")
          .trim()
      }
      continue
    }

    // Skip metadata lines from chord extraction
    const isMetadataLine = line.match(/^(?:genre|best to test|key|bpm|tempo|time signature|meter|description|note|style|tags|title|song|track|name):\s*/i)
    if (isMetadataLine) {
      continue
    }

    // 6. Chord Line Extraction:
    // Splits by '→', '->', '|', ',', '-', or space
    const isExplicitChordLine =
      line.includes("→") ||
      line.includes("->") ||
      line.includes("|") ||
      line.match(/[A-G][#b♭♯]?(?:m|maj|dim|aug|sus|7|9|11|13|b5|#5)?\s*\(\d+/i)

    // Tokenize potential chord sequences (support single spaces, arrows, pipes, commas, dashes)
    const rawTokens = isExplicitChordLine
      ? line.split(/(?:→|->|\|)/).flatMap((t) => t.trim().split(/\s+/))
      : line.split(/(?:,\s*|\s+-\s+|\s+|\t+)/)

    const lineChords: ChordEntry[] = []

    rawTokens.forEach((token) => {
      const clean = token.trim()
      if (!clean) return

      // Extract chord symbol (e.g. Am7 from "Am7 (4 beats)" or "Am7")
      const symbolMatch = clean.match(/^([A-G][#b♭♯]?[^\s()]*)/i)
      if (symbolMatch) {
        const sym = symbolMatch[1]
        const parsed = parseChord(sym)
        if (parsed.valid) {
          const beats = extractBeats(clean, beatsPerBar)
          lineChords.push({
            id: createId(),
            symbol: sym,
            beats,
          })
        }
      }
    })

    if (lineChords.length > 0) {
      currentChords.push(...lineChords)
    }
  }

  commitSection()

  // Fallback: If no chords were extracted, generate a standard diatonic sequence in key
  if (sections.length === 0 || sections.every((s) => s.chords.length === 0)) {
    sections.length = 0
    sections.push({
      id: createId(),
      name: "Main Section",
      chords: [
        { id: createId(), symbol: keyTonic, beats: beatsPerBar },
        { id: createId(), symbol: keyMode === "major" ? "G" : "Em", beats: beatsPerBar },
        { id: createId(), symbol: keyMode === "major" ? "Am" : "F", beats: beatsPerBar },
        { id: createId(), symbol: keyMode === "major" ? "F" : "G", beats: beatsPerBar },
      ],
    })
  }

  return {
    title,
    keyTonic,
    keyMode,
    bpm,
    beatsPerBar,
    sections,
  }
}
