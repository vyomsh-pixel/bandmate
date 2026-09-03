/**
 * BandMate — Smart AI Chord Suggestion Engine.
 *
 * Analyzes current chord progression movement and key to suggest 3 high-value
 * Next Chord recommendations:
 *   1. Harmonic Resolution (Classic cadence)
 *   2. Emotional Contrast (Relative minor / secondary mode)
 *   3. Jazz / Modern Color (7th, sus, or secondary dominant)
 */

import { parseChord } from "./chord-parser"
import { getHarmonicFunction, getRomanNumeral } from "./analysis"
import { diatonicChords } from "./scales"
import type { Key } from "./types"

export interface ChordSuggestion {
  symbol: string
  roman: string
  label: string
  category: "resolution" | "movement" | "color"
  reason: string
}

export function suggestNextChords(currentChords: string[], key: Key): ChordSuggestion[] {
  if (currentChords.length === 0) {
    // Default starting suggestions for key
    const diatonic = diatonicChords(key)
    return [
      {
        symbol: key.tonic,
        roman: key.mode === "major" ? "I" : "i",
        label: "Home / Tonic",
        category: "resolution",
        reason: "Anchor your song with the key's root tonic chord.",
      },
      {
        symbol: diatonic[3]?.symbol || key.tonic,
        roman: key.mode === "major" ? "IV" : "iv",
        label: "Subdominant",
        category: "movement",
        reason: "Creates immediate uplifting musical motion.",
      },
      {
        symbol: diatonic[5]?.symbol || key.tonic,
        roman: key.mode === "major" ? "vi" : "VI",
        label: "Relative Minor",
        category: "color",
        reason: "Adds instant emotional depth and warmth.",
      },
    ]
  }

  const lastSymbol = currentChords[currentChords.length - 1]
  const lastHarm = getHarmonicFunction(lastSymbol, key)
  const diatonic = diatonicChords(key)

  const tonicSymbol = key.tonic
  const subdomSymbol = diatonic[3]?.symbol || "F"
  const domSymbol = diatonic[4]?.symbol || "G"
  const relMinSymbol = diatonic[5]?.symbol || "Am"
  const superTonicSymbol = diatonic[1]?.symbol || "Dm"

  if (lastHarm.role === "dominant") {
    // Dominant -> Resolution to Tonic or Deceptive Cadence to vi
    return [
      {
        symbol: tonicSymbol,
        roman: key.mode === "major" ? "I" : "i",
        label: "Perfect Cadence",
        category: "resolution",
        reason: "Strongest harmonic resolution in western music back to Home.",
      },
      {
        symbol: relMinSymbol,
        roman: key.mode === "major" ? "vi" : "VI",
        label: "Deceptive Cadence",
        category: "color",
        reason: "Surprises the listener by resolving into an emotional minor tone.",
      },
      {
        symbol: subdomSymbol,
        roman: key.mode === "major" ? "IV" : "iv",
        label: "Subdominant Extension",
        category: "movement",
        reason: "Sustains momentum before resolving to the root.",
      },
    ]
  }

  if (lastHarm.role === "subdominant") {
    // Subdominant -> Dominant or Tonic
    return [
      {
        symbol: domSymbol,
        roman: key.mode === "major" ? "V" : "v",
        label: "Dominant Tension",
        category: "movement",
        reason: "Builds forward momentum pointing towards the home key.",
      },
      {
        symbol: `${domSymbol}7`,
        roman: key.mode === "major" ? "V7" : "v7",
        label: "Dominant 7th",
        category: "color",
        reason: "Adds blues/pop harmonic tension to pull back to Tonic.",
      },
      {
        symbol: tonicSymbol,
        roman: key.mode === "major" ? "I" : "i",
        label: "Plagal Cadence (Amen)",
        category: "resolution",
        reason: "Gentle, reverent resolution straight from IV back to I.",
      },
    ]
  }

  // Last chord is Tonic or Borrowed -> Move to Subdominant, ii, or V
  return [
    {
      symbol: subdomSymbol,
      roman: key.mode === "major" ? "IV" : "iv",
      label: "Subdominant Lift",
      category: "movement",
      reason: "Classic pop/rock progression starter that expands the melody.",
    },
    {
      symbol: superTonicSymbol,
      roman: key.mode === "major" ? "ii" : "ii°",
      label: "Supertonic (ii)",
      category: "color",
      reason: "Establishes a smooth ii-V-I jazz or ballad setup.",
    },
    {
      symbol: domSymbol,
      roman: key.mode === "major" ? "V" : "v",
      label: "Dominant Pull",
      category: "resolution",
      reason: "Drives energy upward towards the next measure.",
    },
  ]
}
