"use client"

import { useEffect, useRef, useState } from "react"

// Splits a value like "$4,280", "92%", or "3/12" into an animatable
// leading number plus its surrounding prefix/suffix so we can count up
// without losing currency symbols or units.
function splitValue(value: string | number) {
  const str = String(value)
  const match = str.match(/^(\D*)([\d,]+)(.*)$/)
  if (!match) return { prefix: "", target: null as number | null, suffix: str }
  const [, prefix, digits, suffix] = match
  return { prefix, target: Number(digits.replace(/,/g, "")), suffix }
}

export function CountUp({
  value,
  duration = 900,
}: {
  value: string | number
  duration?: number
}) {
  const { prefix, target, suffix } = splitValue(value)
  const [display, setDisplay] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (target === null) return
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic for a snappy, settling motion
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, duration])

  if (target === null) return <>{suffix}</>
  return (
    <>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </>
  )
}
