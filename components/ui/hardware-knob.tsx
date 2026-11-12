"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface HardwareKnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  unit?: string
  onChange: (val: number) => void
  size?: "sm" | "md" | "lg"
  color?: "amber" | "cyan" | "rose" | "emerald"
  className?: string
}

export function HardwareKnob({
  value,
  min,
  max,
  step = 1,
  label,
  unit = "",
  onChange,
  size = "md",
  color = "amber",
  className,
}: HardwareKnobProps) {
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(value)
  const [active, setActive] = useState(false)

  // Calculate rotation angle: -135deg to +135deg (270deg sweep)
  const percent = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const angle = -135 + percent * 270

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    isDragging.current = true
    startY.current = e.clientY
    startVal.current = value
    setActive(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const deltaY = startY.current - e.clientY // dragging UP increases value
    const range = max - min
    const sensitivity = 200 // pixels for full range sweep
    const deltaVal = (deltaY / sensitivity) * range
    const rawNewVal = startVal.current + deltaVal
    const stepped = Math.round(rawNewVal / step) * step
    const clamped = Math.max(min, Math.min(max, stepped))
    onChange(clamped)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    setActive(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const direction = e.deltaY < 0 ? 1 : -1
    const delta = direction * step * (e.shiftKey ? 5 : 1)
    const clamped = Math.max(min, Math.min(max, value + delta))
    onChange(clamped)
  }

  const sizeClasses = {
    sm: "size-8",
    md: "size-11",
    lg: "size-14",
  }[size]

  const colorGlows = {
    amber: "shadow-[0_0_12px_rgba(251,191,36,0.35)] border-amber-500/60 text-amber-400",
    cyan: "shadow-[0_0_12px_rgba(34,211,238,0.35)] border-cyan-500/60 text-cyan-400",
    rose: "shadow-[0_0_12px_rgba(244,63,94,0.35)] border-rose-500/60 text-rose-400",
    emerald: "shadow-[0_0_12px_rgba(52,211,153,0.35)] border-emerald-500/60 text-emerald-400",
  }[color]

  const indicatorColors = {
    amber: "bg-amber-400 shadow-[0_0_6px_#fbbf24]",
    cyan: "bg-cyan-400 shadow-[0_0_6px_#22d3ee]",
    rose: "bg-rose-400 shadow-[0_0_6px_#f43f5e]",
    emerald: "bg-emerald-400 shadow-[0_0_6px_#34d399]",
  }[color]

  return (
    <div
      className={cn("flex flex-col items-center select-none group touch-none cursor-ns-resize", className)}
      onWheel={handleWheel}
      title={`${label}: ${value}${unit} (Drag up/down or scroll)`}
    >
      {/* Knob outer bezel */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          sizeClasses,
          "relative rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border-2 border-zinc-600/60 shadow-md transition-shadow duration-150 flex items-center justify-center",
          active && colorGlows,
          "hover:border-zinc-400 active:scale-95"
        )}
        style={{
          boxShadow: active
            ? undefined
            : "inset 0 1px 1px rgba(255,255,255,0.2), 0 3px 6px rgba(0,0,0,0.6)",
        }}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
      >
        {/* Knurled grip grooves */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-800 border border-zinc-700/50 flex items-center justify-center">
          {/* Rotational indicator dot/notch */}
          <div
            className="absolute inset-0 flex items-start justify-center pt-0.5 transition-transform duration-75"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className={cn("w-1 h-2 rounded-full", indicatorColors)} />
          </div>
          {/* Center cap */}
          <div className="size-3.5 rounded-full bg-zinc-950/80 border border-zinc-700/80 shadow-inner" />
        </div>
      </div>

      {/* Label & Value display */}
      <div className="mt-1 flex flex-col items-center pointer-events-none">
        <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400 group-hover:text-zinc-200">
          {label}
        </span>
        <span className={cn("text-[10px] font-mono font-bold leading-tight", active ? "text-amber-400" : "text-zinc-300")}>
          {value}
          <span className="text-[8px] font-normal text-zinc-500 ml-0.5">{unit}</span>
        </span>
      </div>
    </div>
  )
}
