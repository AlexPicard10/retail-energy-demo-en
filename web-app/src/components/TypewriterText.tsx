import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export default function TypewriterText({
  text,
  speed = 26,
  className = '',
  cursor = true,
  delay = 0,
}: {
  text: string
  speed?: number
  className?: string
  cursor?: boolean
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const [out, setOut] = useState('')

  useEffect(() => {
    if (!inView) return
    let timer = 0
    let i = 0
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        i += 1
        setOut(text.slice(0, i))
        if (i >= text.length) clearInterval(timer)
      }, speed) as unknown as number
    }, delay) as unknown as number
    return () => {
      clearTimeout(start)
      clearInterval(timer)
    }
  }, [inView, text, speed, delay])

  return (
    <span ref={ref} className={className}>
      {out}
      {cursor && out.length < text.length && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[2px] animate-pulse bg-current align-middle" />
      )}
    </span>
  )
}
