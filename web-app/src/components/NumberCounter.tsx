import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export default function NumberCounter({
  to,
  duration = 1.2,
  prefix = '',
  suffix = '',
  decimals = 0,
  live = false,
  liveIntervalMs = 2500,
  liveStepRange = [3, 7],
}: {
  to: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  live?: boolean
  liveIntervalMs?: number
  liveStepRange?: [number, number]
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const [value, setValue] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(eased * to)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!inView || !live) return
    const [lo, hi] = liveStepRange
    const startDelay = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const step = Math.floor(lo + Math.random() * (hi - lo + 1))
        setValue((v) => v + step)
        setPulse(true)
        if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
        pulseTimeoutRef.current = setTimeout(() => setPulse(false), 600)
      }, liveIntervalMs)
    }, duration * 1000 + 200)
    return () => {
      clearTimeout(startDelay)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [inView, live, duration, liveIntervalMs, liveStepRange])

  return (
    <span ref={ref} className={live ? 'relative inline-flex items-center' : undefined}>
      <span
        className={
          live
            ? `transition-[text-shadow,color] duration-500 ${
                pulse ? 'text-engie-deep [text-shadow:0_0_18px_rgba(91,215,255,0.65)]' : ''
              }`
            : undefined
        }
      >
        {prefix}
        {value.toLocaleString('en-US', {
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        })}
        {suffix}
      </span>
      {live && (
        <span
          aria-hidden
          className={`ml-2 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-engie-blue transition-opacity duration-300 ${
            pulse ? 'opacity-100 shadow-[0_0_10px_3px_rgba(0,170,255,0.6)]' : 'opacity-50'
          }`}
        />
      )}
    </span>
  )
}
