/**
 * BandMate — Lead Sheet & Printable Chord Sheet Exporter.
 *
 * Formats a song progression into a clean, professional ASCII / text chord sheet
 * suitable for printing, copying into emails, or sharing with bandmates.
 */

import { makeKey, diatonicChords } from "../music/scales"
import { getHarmonicFunction } from "../music/analysis"
import { suggestCapo, chordShapeForCapo } from "../music/capo"
import type { Song } from "../music/types"

export function generateLeadSheetText(song: Song): string {
  const keyObj = makeKey(song.keyTonic, song.keyMode)
  const allSymbols = song.sections.flatMap((s) => s.chords.map((c) => c.symbol))
  const capoRec = suggestCapo(allSymbols, keyObj).find((s) => s.fret > 0 && s.score > 0)

  let text = `=====================================================\n`
  text += `  ${song.title.toUpperCase()}\n`
  text += `  Key: ${song.keyTonic} ${song.keyMode} | BPM: ${song.bpm} | Time: ${song.beatsPerBar}/4\n`

  if (capoRec) {
    text += `  Capo Recommendation: Capo ${capoRec.fret} (Play open shapes!)\n`
  }

  text += `=====================================================\n\n`

  for (const section of song.sections) {
    text += `[ ${section.name.toUpperCase()} ]\n`

    if (section.chords.length === 0) {
      text += `  (Empty section)\n\n`
      continue
    }

    // Format chords in rows of 4
    let chordRow = "  "
    let romanRow = "  "

    section.chords.forEach((c, idx) => {
      const harm = getHarmonicFunction(c.symbol, keyObj)
      const capoShape = capoRec ? ` (${chordShapeForCapo(c.symbol, capoRec.fret, keyObj.accidental)})` : ""
      const symbolText = `${c.symbol}${capoShape}`.padEnd(14)
      const romanText = `${harm.roman || "-"}`.padEnd(14)

      chordRow += symbolText
      romanRow += romanText

      if ((idx + 1) % 4 === 0 || idx === section.chords.length - 1) {
        text += `${chordRow}\n`
        text += `${romanRow}\n\n`
        chordRow = "  "
        romanRow = "  "
      }
    })
  }

  text += `-----------------------------------------------------\n`
  text += `Generated with BandMate Song Lab — https://bandmate-main.vercel.app\n`
  return text
}

export function downloadLeadSheetText(song: Song) {
  const textContent = generateLeadSheetText(song)
  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const fileName = `${song.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "song"}-chordsheet.txt`
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
