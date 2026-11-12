"use client"

import { useEffect, useRef, useState } from "react"
import { getAudioEngine } from "@/lib/audio/audio-engine"
import { cn } from "@/lib/utils"

interface AudioVuMeterProps {
  className?: string
  barsCount?: number
}

/**
 * BandMate — 21st.dev Tactile VFD Audio Activity VU Meter.
 *
 * Connects directly to WebAudio AnalyserNode and animates glowing LED segments:
 * Green (safe signal) -> Amber (warm presence) -> Red (peak headroom).
 */
export function AudioVuMeter({ className, barsCount = 7 }: AudioVuMeterProps) {
  const [level, setLevel] = useState(0)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    const update = () => {
      if (!active) return
      const engine = getAudioEngine()
      const analyser = engine.getAnalyser()

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          sum += data[i]
        }
        const avg = sum / data.length
        // Normalize 0-255 to 0-1
        const raw = Math.min(1, avg / 120)
        setLevel((prev) => Math.max(raw, prev * 0.82)) // smooth phosphor decay
      } else {
        setLevel((prev) => prev * 0.8)
      }

      animRef.current = requestAnimationFrame(update)
    }

    animRef.current = requestAnimationFrame(update)

    return () => {
      active = false
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const activeBars = Math.round(level * barsCount)

  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-[#090a0d] border border-zinc-800/80 px-2 py-1 rounded-lg shadow-inner select-none",
        className
      )}
      title="Real-time studio output signal meter"
    >
      <span className="text-[8px] font-mono font-bold text-zinc-500 mr-0.5">VU</span>
      <div className="flex items-center gap-0.5 h-3">
        {Array.from({ length: barsCount }).map((_, idx) => {
          const isLit = idx < activeBars
          const isPeak = idx >= barsCount - 1
          const isWarm = idx >= barsCount - 3 && !isPeak

          return (
            <div
              key={idx}
              className={cn(
                "w-1 rounded-[1px] transition-all duration-75",
                isLit
                  ? isPeak
                    ? "h-3.5 bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                    : isWarm
                      ? "h-3 bg-amber-400 shadow-[0_0_5px_#fbbf24]"
                      : "h-2.5 bg-emerald-400 shadow-[0_0_4px_#34d399]"
                  : "h-1.5 bg-zinc-800/80"
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
